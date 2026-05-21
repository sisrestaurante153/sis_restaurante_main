// @ts-nocheck
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@/generated/prisma/client";
import {
  importacao_status,
  PrismaClient
} from "@/generated/prisma/client";
import { buildDependencyClosure } from "@/modules/engineering/domain/composition";
import {
  buildExternalKey,
  mapImportedComponentType,
  mapImportedItemType,
  numericString
} from "@/modules/import/domain/legacy-import";
import { normalizeAliasValue } from "@/modules/import/domain/reconciliation";
import { recalculateCascade } from "@/modules/engineering/server/cost-engine-service";

export type ImportedItem = {
  source_kind: string;
  sheet_name: string;
  row_number: number;
  display_name: string;
  canonical_name: string;
  item_type: string;
  purchase_unit: string | null;
  usage_unit?: string | null;
  purchase_to_usage_factor?: number | null;
  purchase_cost?: number | null;
  unit_cost_reference?: number | null;
  package_units?: number | null;
};

export type ImportedRecipeComponent = {
  source_row: number;
  raw_name: string;
  resolved_canonical_name: string | null;
  gross_weight?: number | null;
  net_weight?: number | null;
  quantity?: number | null;
  unit: string | null;
  unit_cost?: number | null;
};

export type ImportedRecipe = {
  sheet_name: string;
  sheet_product_name: string;
  normalized_product_name: string;
  recipe_kind: string;
  yield_value: number | null;
  ingredient_components: ImportedRecipeComponent[];
  packaging_components: ImportedRecipeComponent[];
};

export type ImportReport = {
  source_workbook: string;
  summary: Record<string, unknown>;
  staging: {
    items: ImportedItem[];
    recipes: ImportedRecipe[];
    weights: Array<Record<string, unknown>>;
  };
  aliases: Array<{
    canonical_name: string;
    alias: string;
    confidence: number;
    sheet_name?: string;
    row_number?: number;
  }>;
  conflicts: Array<Record<string, unknown>>;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function prismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });
}

async function ensureUnits(prisma: PrismaClient) {
  const units = [
    { ds_codigo: "kg", nm_unidade: "Quilograma", tp_unidade: "massa" as const },
    { ds_codigo: "g", nm_unidade: "Grama", tp_unidade: "massa" as const },
    { ds_codigo: "l", nm_unidade: "Litro", tp_unidade: "volume" as const },
    { ds_codigo: "ml", nm_unidade: "Mililitro", tp_unidade: "volume" as const },
    { ds_codigo: "un", nm_unidade: "Unidade", tp_unidade: "contagem" as const },
    { ds_codigo: "maço", nm_unidade: "Maço", tp_unidade: "contagem" as const }
  ];

  const byCode = new Map<
    string,
    Awaited<ReturnType<typeof prisma.unidadeMedida.upsert>>
  >();

  for (const unit of units) {
    const persisted = await prisma.unidadeMedida.upsert({
      where: { ds_codigo: unit.ds_codigo },
      update: unit,
      create: unit
    });
    byCode.set(unit.ds_codigo, persisted);
  }

  return byCode;
}

async function ensureSuppliers(prisma: PrismaClient) {
  const suppliers = ["VMARKET LEGADO", "EMBALAGENS LEGADO"];
  const map = new Map<
    string,
    Awaited<ReturnType<typeof prisma.fornecedor.upsert>>
  >();

  for (const supplierName of suppliers) {
    const supplier = await prisma.fornecedor.upsert({
      where: { nm_fornecedor: supplierName },
      update: {},
      create: { nm_fornecedor: supplierName }
    });
    map.set(supplierName, supplier);
  }

  return map;
}

async function upsertImportedItems(
  prisma: PrismaClient,
  importRunId: string,
  items: ImportedItem[],
  units: Map<
    string,
    Awaited<ReturnType<typeof prisma.unidadeMedida.findUnique>>
  >,
  suppliers: Map<
    string,
    Awaited<ReturnType<typeof prisma.fornecedor.findUnique>>
  >
) {
  const byCanonical = new Map<
    string,
    Awaited<ReturnType<typeof prisma.item.upsert>>
  >();

  for (const item of items) {
    const purchaseUnit = item.purchase_unit ? units.get(item.purchase_unit) : null;
    const usageUnitCode = item.usage_unit ?? item.purchase_unit;
    const usageUnit = usageUnitCode ? units.get(usageUnitCode) : null;
    const usageCostReference =
      item.purchase_to_usage_factor &&
      item.purchase_to_usage_factor > 0 &&
      item.purchase_cost !== null &&
      item.purchase_cost !== undefined &&
      purchaseUnit &&
      usageUnit &&
      purchaseUnit.cd_unidade_medida !== usageUnit.cd_unidade_medida
        ? item.purchase_cost / item.purchase_to_usage_factor
        : item.unit_cost_reference ?? item.purchase_cost;
    const persisted = await prisma.item.upsert({
      where: {
        nm_normalizado_cd_restaurante: {
          nm_normalizado: item.canonical_name,
          cd_restaurante: "rest_padrao"
        }
      },
      update: {
        nm_item: item.display_name,
        tp_item: mapImportedItemType(item.item_type),
        cd_unidade_estoque: usageUnit?.cd_unidade_medida ?? null,
        cd_unidade_uso_padrao: usageUnit?.cd_unidade_medida ?? null
      },
      create: {
        nm_item: item.display_name,
        nm_normalizado: item.canonical_name,
        tp_item: mapImportedItemType(item.item_type),
        cd_unidade_estoque: usageUnit?.cd_unidade_medida ?? null,
        cd_unidade_uso_padrao: usageUnit?.cd_unidade_medida ?? null,
        cd_restaurante: "rest_padrao"
      }
    });

    byCanonical.set(item.canonical_name, persisted);

    if (
      purchaseUnit &&
      usageUnit &&
      purchaseUnit.cd_unidade_medida !== usageUnit.cd_unidade_medida &&
      item.purchase_to_usage_factor &&
      item.purchase_to_usage_factor > 0
    ) {
      await prisma.conversaoUnidade.upsert({
        where: {
          cd_item_cd_unidade_origem_cd_unidade_destino: {
            cd_item: persisted.cd_item,
            cd_unidade_origem: purchaseUnit.cd_unidade_medida,
            cd_unidade_destino: usageUnit.cd_unidade_medida
          }
        },
        update: {
          vl_fator: numericString(item.purchase_to_usage_factor, "0.000001")!,
          ds_origem: "importacao_legacy_excel"
        },
        create: {
          cd_item: persisted.cd_item,
          cd_unidade_origem: purchaseUnit.cd_unidade_medida,
          cd_unidade_destino: usageUnit.cd_unidade_medida,
          vl_fator: numericString(item.purchase_to_usage_factor, "0.000001")!,
          ds_origem: "importacao_legacy_excel"
        }
      });
    }

    await prisma.importacaoStaging.upsert({
      where: {
        cd_importacao_execucao_nm_entidade_ds_chave_externa: {
          cd_importacao_execucao: importRunId,
          nm_entidade: "item",
          ds_chave_externa: buildExternalKey(
            "item",
            item.sheet_name,
            item.row_number,
            item.canonical_name
          )
        }
      },
      update: {
        js_payload: toJson(item),
        tp_status: "imported",
        cd_item: persisted.cd_item
      },
      create: {
        cd_importacao_execucao: importRunId,
        nm_entidade: "item",
        ds_chave_externa: buildExternalKey(
          "item",
          item.sheet_name,
          item.row_number,
          item.canonical_name
        ),
        nm_planilha: item.sheet_name,
        nr_linha: item.row_number,
        js_payload: toJson(item),
        tp_status: "imported",
        cd_item: persisted.cd_item
      }
    });

    if (item.source_kind === "vmarket" || item.source_kind === "embalagem") {
      const supplierName =
        item.source_kind === "embalagem"
          ? "EMBALAGENS LEGADO"
          : "VMARKET LEGADO";
      const supplier = suppliers.get(supplierName);

      if (supplier && purchaseUnit) {
        const purchaseCost = numericString(item.purchase_cost, "0.0000")!;
        const unitCost = numericString(usageCostReference, "0.0000")!;

        await prisma.itemCompra.upsert({
          where: {
            cd_item_cd_fornecedor_cd_unidade_compra: {
              cd_item: persisted.cd_item,
              cd_fornecedor: supplier.cd_fornecedor,
              cd_unidade_compra: purchaseUnit.cd_unidade_medida
            }
          },
          update: {
            vl_qtd_embalagem: numericString(
              item.package_units ?? 1,
              "1.0000"
            )!,
            vl_custo_compra: purchaseCost,
            vl_custo_unitario_base: numericString(usageCostReference, "0.000000")!
          },
          create: {
            cd_item: persisted.cd_item,
            cd_fornecedor: supplier.cd_fornecedor,
            cd_unidade_compra: purchaseUnit.cd_unidade_medida,
            vl_qtd_embalagem: numericString(
              item.package_units ?? 1,
              "1.0000"
            )!,
            vl_custo_compra: purchaseCost,
            vl_custo_unitario_base: numericString(usageCostReference, "0.000000")!
          }
        });

        await prisma.custoSnapshotItem.create({
          data: {
            cd_item: persisted.cd_item,
            vl_custo_unitario: numericString(usageCostReference, "0.000000")!,
            vl_custo_kg_uso: numericString(usageCostReference, "0.000000"),
            vl_custo_total: unitCost,
            ds_origem_recalculo: "importacao_legacy_excel"
          }
        });
      }
    }
  }

  return byCanonical;
}

async function applyAliases(
  prisma: PrismaClient,
  aliases: ImportReport["aliases"],
  itemsByCanonical: Map<
    string,
    Awaited<ReturnType<typeof prisma.item.findUnique>>
  >
) {
  for (const alias of aliases) {
    const item = itemsByCanonical.get(alias.canonical_name);
    if (!item) {
      continue;
    }

    await prisma.itemAlias.upsert({
      where: {
        cd_item_nm_alias_normalizado: {
          cd_item: item.cd_item,
          nm_alias_normalizado: normalizeAliasValue(alias.alias)
        }
      },
      update: {
        nm_alias: alias.alias,
        vl_confianca: alias.confidence.toFixed(2),
        ds_origem: "importacao_excel"
      },
      create: {
        cd_item: item.cd_item,
        nm_alias: alias.alias,
        nm_alias_normalizado: normalizeAliasValue(alias.alias),
        vl_confianca: alias.confidence.toFixed(2),
        ds_origem: "importacao_excel"
      }
    });
  }
}

async function importRecipes(
  prisma: PrismaClient,
  importRunId: string,
  recipes: ImportedRecipe[],
  itemsByCanonical: Map<
    string,
    Awaited<ReturnType<typeof prisma.item.findUnique>>
  >,
  units: Map<
    string,
    Awaited<ReturnType<typeof prisma.unidadeMedida.findUnique>>
  >
) {
  const directEdges: Array<{ parentItemId: string; childItemId: string }> = [];

  for (const recipe of recipes) {
    const resultItem = itemsByCanonical.get(recipe.normalized_product_name);
    if (!resultItem) {
      continue;
    }

    const ficha = await prisma.fichaTecnica.upsert({
      where: {
        cd_item_resultante_nr_versao: {
          cd_item_resultante: resultItem.cd_item,
          nr_versao: 1
        }
      },
      update: {
        tp_status: "ativa",
        tp_modo_rendimento: "peso_final",
        vl_peso_final: numericString(recipe.yield_value, "1.0000"),
        cd_restaurante: "rest_padrao"
      },
      create: {
        cd_item_resultante: resultItem.cd_item,
        nr_versao: 1,
        tp_status: "ativa",
        tp_modo_rendimento: "peso_final",
        vl_peso_final: numericString(recipe.yield_value, "1.0000"),
        cd_restaurante: "rest_padrao"
      }
    });

    await prisma.fichaComponente.deleteMany({
      where: { cd_ficha_tecnica: ficha.cd_ficha_tecnica }
    });

    let order = 1;
    for (const component of [
      ...recipe.ingredient_components.map((value) => ({
        ...value,
        componentType: "ingredient"
      })),
      ...recipe.packaging_components.map((value) => ({
        ...value,
        componentType: "packaging"
      }))
    ]) {
      if (!component.resolved_canonical_name) {
        continue;
      }

      const componentItem = itemsByCanonical.get(
        component.resolved_canonical_name
      );
      if (!componentItem) {
        continue;
      }

      const unit = units.get(component.unit ?? "un") ?? units.get("un");
      if (!unit) {
        continue;
      }

      const quantity =
        numericString(component.net_weight, null) ??
        numericString(component.gross_weight, null) ??
        numericString(component.quantity, null);

      if (!quantity) {
        continue;
      }

      await prisma.fichaComponente.create({
        data: {
          cd_ficha_tecnica: ficha.cd_ficha_tecnica,
          cd_item_componente: componentItem.cd_item,
          tp_componente: mapImportedComponentType(component.componentType),
          nr_ordem: order,
          vl_qtd_bruta: quantity,
          vl_qtd_limpa: numericString(component.net_weight, null),
          cd_unidade_uso: unit.cd_unidade_medida,
          vl_custo_unitario_snapshot: numericString(component.unit_cost, null),
          vl_custo_total_snapshot: numericString(component.unit_cost, null)
        }
      });

      order += 1;
      directEdges.push({
        parentItemId: resultItem.cd_item,
        childItemId: componentItem.cd_item
      });
    }

    await prisma.importacaoStaging.upsert({
      where: {
        cd_importacao_execucao_nm_entidade_ds_chave_externa: {
          cd_importacao_execucao: importRunId,
          nm_entidade: "ficha_tecnica",
          ds_chave_externa: buildExternalKey(
            "ficha",
            recipe.sheet_name,
            2,
            recipe.normalized_product_name
          )
        }
      },
      update: {
        js_payload: toJson(recipe),
        tp_status: "imported",
        cd_item: resultItem.cd_item,
        cd_ficha_tecnica: ficha.cd_ficha_tecnica
      },
      create: {
        cd_importacao_execucao: importRunId,
        nm_entidade: "ficha_tecnica",
        ds_chave_externa: buildExternalKey(
          "ficha",
          recipe.sheet_name,
          2,
          recipe.normalized_product_name
        ),
        nm_planilha: recipe.sheet_name,
        nr_linha: 2,
        js_payload: toJson(recipe),
        tp_status: "imported",
        cd_item: resultItem.cd_item,
        cd_ficha_tecnica: ficha.cd_ficha_tecnica
      }
    });
  }

  await prisma.dependenciaItem.deleteMany();
  const closure = buildDependencyClosure(directEdges);

  if (closure.length > 0) {
    await prisma.dependenciaItem.createMany({
      data: closure.map((row) => ({
        cd_item_ascendente: row.itemAscendenteId,
        cd_item_descendente: row.itemDescendenteId,
        nr_profundidade: row.profundidade,
        sn_relacao_direta: row.relacaoDireta
      }))
    });
  }

  return directEdges.length;
}

async function persistConflicts(
  prisma: PrismaClient,
  importRunId: string,
  conflicts: ImportReport["conflicts"]
) {
  for (const conflict of conflicts) {
    await prisma.importacaoConflito.create({
      data: {
        cd_importacao_execucao: importRunId,
        tp_conflito: String(conflict.type ?? "unknown"),
        ds_nome_bruto:
          typeof conflict.raw_name === "string" ? conflict.raw_name : null,
        nm_normalizado:
          typeof conflict.normalized_name === "string"
            ? conflict.normalized_name
            : null,
        nm_planilha:
          typeof conflict.sheet_name === "string" ? conflict.sheet_name : null,
        nr_linha:
          typeof conflict.row_number === "number" ? conflict.row_number : null,
        vl_confianca:
          typeof conflict.confidence === "number"
            ? conflict.confidence.toFixed(4)
            : null,
        js_detalhes: toJson(conflict)
      }
    });
  }
}

export async function loadLegacyImportReport(input: {
  reportPath: string;
  executionId?: string | null;
  dryRun?: boolean;
}) {
  const dryRun = input.dryRun ?? false;
  const inputAbsolutePath = path.resolve(input.reportPath);
  const outputDir = path.dirname(inputAbsolutePath);
  const report = JSON.parse(
    await readFile(inputAbsolutePath, "utf-8")
  ) as ImportReport;

  if (dryRun) {
    const preview = {
      sourceWorkbook: report.source_workbook,
      itemsToImport: report.staging.items.length,
      recipesToImport: report.staging.recipes.length,
      aliasesToCreate: report.aliases.length,
      conflictsToPersist: report.conflicts.length
    };
    return preview;
  }

  const prisma = prismaClient();
  const managedExternally = Boolean(input.executionId);
  const importRunId =
    input.executionId ??
    (
      await prisma.importacaoExecucao.create({
        data: {
          ds_origem_arquivo: report.source_workbook,
          tp_status: importacao_status.processando,
          ds_estagio_atual: "carregando_banco",
          js_resumo: toJson(report.summary)
        }
      })
    ).cd_importacao;

  try {
    if (managedExternally) {
      await prisma.importacaoExecucao.update({
        where: { cd_importacao: importRunId },
        data: {
          js_resumo: toJson(report.summary),
          ds_estagio_atual: "carregando_banco"
        }
      });
    }

    const units = await ensureUnits(prisma);
    const suppliers = await ensureSuppliers(prisma);
    const itemsByCanonical = await upsertImportedItems(
      prisma,
      importRunId,
      report.staging.items,
      units,
      suppliers
    );

    await applyAliases(prisma, report.aliases, itemsByCanonical);
    const directEdges = await importRecipes(
      prisma,
      importRunId,
      report.staging.recipes,
      itemsByCanonical,
      units
    );
    await persistConflicts(prisma, importRunId, report.conflicts);
    if (itemsByCanonical.size > 0) {
      await recalculateCascade(
        prisma,
        [...itemsByCanonical.values()].map((item) => item.cd_item),
        "importacao_legacy_excel.load"
      );
    }

    const status =
      report.conflicts.length > 0
        ? importacao_status.concluida_com_conflitos
        : importacao_status.concluida;

    if (!managedExternally) {
      await prisma.importacaoExecucao.update({
        where: { cd_importacao: importRunId },
        data: {
          tp_status: status,
          ds_estagio_atual: "concluida",
          ts_fim: new Date()
        }
      });
    }

    const loadSummary = {
      importRunId,
      itemsImported: report.staging.items.length,
      recipesImported: report.staging.recipes.length,
      conflictsRecorded: report.conflicts.length,
      dependencyEdges: directEdges,
      status
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(outputDir, "load-result.json"),
      JSON.stringify(loadSummary, null, 2),
      "utf-8"
    );

    return loadSummary;
  } catch (error) {
    if (!managedExternally) {
      await prisma.importacaoExecucao.update({
        where: { cd_importacao: importRunId },
        data: {
          tp_status: importacao_status.falha,
          ds_estagio_atual: "falha",
          ts_fim: new Date()
        }
      });
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const executionIdArg = args.find((value) => value.startsWith("--execution-id="));
  const inputPath =
    args.find((value) => value !== "--dry-run" && !value.startsWith("--execution-id=")) ??
    "artifacts/imports/test-run/report.json";
  const result = await loadLegacyImportReport({
    reportPath: inputPath,
    executionId: executionIdArg ? executionIdArg.split("=")[1] : null,
    dryRun
  });

  console.log(JSON.stringify(result, null, 2));
}

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentModulePath) {
  void main();
}
