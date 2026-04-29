import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@/generated/prisma/client";
import {
  FichaStatus,
  ImportacaoLinhaStatus,
  ImportacaoStatus,
  PrismaClient,
  UnidadeTipo
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
    { codigo: "kg", nome: "Quilograma", tipo: UnidadeTipo.massa },
    { codigo: "g", nome: "Grama", tipo: UnidadeTipo.massa },
    { codigo: "l", nome: "Litro", tipo: UnidadeTipo.volume },
    { codigo: "ml", nome: "Mililitro", tipo: UnidadeTipo.volume },
    { codigo: "un", nome: "Unidade", tipo: UnidadeTipo.contagem },
    { codigo: "maço", nome: "Maço", tipo: UnidadeTipo.contagem }
  ];

  const byCode = new Map<
    string,
    Awaited<ReturnType<typeof prisma.unidadeMedida.upsert>>
  >();

  for (const unit of units) {
    const persisted = await prisma.unidadeMedida.upsert({
      where: { codigo: unit.codigo },
      update: unit,
      create: unit
    });
    byCode.set(unit.codigo, persisted);
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
      where: { nome: supplierName },
      update: {},
      create: { nome: supplierName }
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
      purchaseUnit.id !== usageUnit.id
        ? item.purchase_cost / item.purchase_to_usage_factor
        : item.unit_cost_reference ?? item.purchase_cost;
    const persisted = await prisma.item.upsert({
      where: { nomeNormalizado: item.canonical_name },
      update: {
        nome: item.display_name,
        tipoPrincipal: mapImportedItemType(item.item_type),
        unidadeEstoqueId: usageUnit?.id ?? null,
        unidadeUsoPadraoId: usageUnit?.id ?? null
      },
      create: {
        nome: item.display_name,
        nomeNormalizado: item.canonical_name,
        tipoPrincipal: mapImportedItemType(item.item_type),
        unidadeEstoqueId: usageUnit?.id ?? null,
        unidadeUsoPadraoId: usageUnit?.id ?? null
      }
    });

    byCanonical.set(item.canonical_name, persisted);

    if (
      purchaseUnit &&
      usageUnit &&
      purchaseUnit.id !== usageUnit.id &&
      item.purchase_to_usage_factor &&
      item.purchase_to_usage_factor > 0
    ) {
      await prisma.conversaoUnidade.upsert({
        where: {
          itemId_unidadeOrigemId_unidadeDestinoId: {
            itemId: persisted.id,
            unidadeOrigemId: purchaseUnit.id,
            unidadeDestinoId: usageUnit.id
          }
        },
        update: {
          fator: numericString(item.purchase_to_usage_factor, "0.000001")!,
          origem: "importacao_legacy_excel"
        },
        create: {
          itemId: persisted.id,
          unidadeOrigemId: purchaseUnit.id,
          unidadeDestinoId: usageUnit.id,
          fator: numericString(item.purchase_to_usage_factor, "0.000001")!,
          origem: "importacao_legacy_excel"
        }
      });
    }

    await prisma.importacaoStaging.upsert({
      where: {
        execucaoId_entidade_chaveExterna: {
          execucaoId: importRunId,
          entidade: "item",
          chaveExterna: buildExternalKey(
            "item",
            item.sheet_name,
            item.row_number,
            item.canonical_name
          )
        }
      },
      update: {
        payloadJson: toJson(item),
        status: ImportacaoLinhaStatus.imported,
        itemId: persisted.id
      },
      create: {
        execucaoId: importRunId,
        entidade: "item",
        chaveExterna: buildExternalKey(
          "item",
          item.sheet_name,
          item.row_number,
          item.canonical_name
        ),
        sheetName: item.sheet_name,
        rowNumber: item.row_number,
        payloadJson: toJson(item),
        status: ImportacaoLinhaStatus.imported,
        itemId: persisted.id
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
            itemId_fornecedorId_unidadeCompraId: {
              itemId: persisted.id,
              fornecedorId: supplier.id,
              unidadeCompraId: purchaseUnit.id
            }
          },
          update: {
            quantidadePorEmbalagem: numericString(
              item.package_units ?? 1,
              "1.0000"
            )!,
            custoCompra: purchaseCost,
            custoUnitarioBase: numericString(usageCostReference, "0.000000")!
          },
          create: {
            itemId: persisted.id,
            fornecedorId: supplier.id,
            unidadeCompraId: purchaseUnit.id,
            quantidadePorEmbalagem: numericString(
              item.package_units ?? 1,
              "1.0000"
            )!,
            custoCompra: purchaseCost,
            custoUnitarioBase: numericString(usageCostReference, "0.000000")!
          }
        });

        await prisma.custoSnapshotItem.create({
          data: {
            itemId: persisted.id,
            custoUnitarioAtual: numericString(usageCostReference, "0.000000")!,
            custoPorKgOuUnidadeUso: numericString(usageCostReference, "0.000000"),
            custoTotalAtual: unitCost,
            origemRecalculo: "importacao_legacy_excel"
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
        itemId_aliasNormalizado: {
          itemId: item.id,
          aliasNormalizado: normalizeAliasValue(alias.alias)
        }
      },
      update: {
        alias: alias.alias,
        confianca: alias.confidence.toFixed(2),
        origem: "importacao_excel"
      },
      create: {
        itemId: item.id,
        alias: alias.alias,
        aliasNormalizado: normalizeAliasValue(alias.alias),
        confianca: alias.confidence.toFixed(2),
        origem: "importacao_excel"
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
        itemResultanteId_versao: {
          itemResultanteId: resultItem.id,
          versao: 1
        }
      },
      update: {
        status: FichaStatus.ativa,
        modoRendimento: "peso_final",
        pesoFinalInformado: numericString(recipe.yield_value, "1.0000")
      },
      create: {
        itemResultanteId: resultItem.id,
        versao: 1,
        status: FichaStatus.ativa,
        modoRendimento: "peso_final",
        pesoFinalInformado: numericString(recipe.yield_value, "1.0000")
      }
    });

    await prisma.fichaComponente.deleteMany({
      where: { fichaTecnicaId: ficha.id }
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
          fichaTecnicaId: ficha.id,
          itemComponenteId: componentItem.id,
          tipoComponente: mapImportedComponentType(component.componentType),
          ordem: order,
          quantidadeBruta: quantity,
          quantidadeLimpa: numericString(component.net_weight, null),
          unidadeUsoId: unit.id,
          custoUnitarioSnapshot: numericString(component.unit_cost, null),
          custoTotalSnapshot: numericString(component.unit_cost, null)
        }
      });

      order += 1;
      directEdges.push({
        parentItemId: resultItem.id,
        childItemId: componentItem.id
      });
    }

    await prisma.importacaoStaging.upsert({
      where: {
        execucaoId_entidade_chaveExterna: {
          execucaoId: importRunId,
          entidade: "ficha_tecnica",
          chaveExterna: buildExternalKey(
            "ficha",
            recipe.sheet_name,
            2,
            recipe.normalized_product_name
          )
        }
      },
      update: {
        payloadJson: toJson(recipe),
        status: ImportacaoLinhaStatus.imported,
        itemId: resultItem.id,
        fichaTecnicaId: ficha.id
      },
      create: {
        execucaoId: importRunId,
        entidade: "ficha_tecnica",
        chaveExterna: buildExternalKey(
          "ficha",
          recipe.sheet_name,
          2,
          recipe.normalized_product_name
        ),
        sheetName: recipe.sheet_name,
        rowNumber: 2,
        payloadJson: toJson(recipe),
        status: ImportacaoLinhaStatus.imported,
        itemId: resultItem.id,
        fichaTecnicaId: ficha.id
      }
    });
  }

  await prisma.dependenciaItem.deleteMany();
  const closure = buildDependencyClosure(directEdges);

  if (closure.length > 0) {
    await prisma.dependenciaItem.createMany({
      data: closure.map((row) => ({
        itemAscendenteId: row.itemAscendenteId,
        itemDescendenteId: row.itemDescendenteId,
        profundidade: row.profundidade,
        relacaoDireta: row.relacaoDireta
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
        execucaoId: importRunId,
        tipo: String(conflict.type ?? "unknown"),
        rawName:
          typeof conflict.raw_name === "string" ? conflict.raw_name : null,
        normalizedName:
          typeof conflict.normalized_name === "string"
            ? conflict.normalized_name
            : null,
        sheetName:
          typeof conflict.sheet_name === "string" ? conflict.sheet_name : null,
        rowNumber:
          typeof conflict.row_number === "number" ? conflict.row_number : null,
        confidence:
          typeof conflict.confidence === "number"
            ? conflict.confidence.toFixed(4)
            : null,
        detalhesJson: toJson(conflict)
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
          origemArquivo: report.source_workbook,
          status: ImportacaoStatus.processando,
          estagioAtual: "carregando_banco",
          resumoJson: toJson(report.summary)
        }
      })
    ).id;

  try {
    if (managedExternally) {
      await prisma.importacaoExecucao.update({
        where: { id: importRunId },
        data: {
          resumoJson: toJson(report.summary),
          estagioAtual: "carregando_banco"
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
        [...itemsByCanonical.values()].map((item) => item.id),
        "importacao_legacy_excel.load"
      );
    }

    const status =
      report.conflicts.length > 0
        ? ImportacaoStatus.concluida_com_conflitos
        : ImportacaoStatus.concluida;

    if (!managedExternally) {
      await prisma.importacaoExecucao.update({
        where: { id: importRunId },
        data: {
          status,
          estagioAtual: "concluida",
          finalizadoEm: new Date()
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
        where: { id: importRunId },
        data: {
          status: ImportacaoStatus.falha,
          estagioAtual: "falha",
          finalizadoEm: new Date()
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
