"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/access/server/authorization";
import { ActiveImportExecutionError } from "@/modules/import/domain/import-execution";
import { parseOperationalItemsCsv } from "@/modules/import/domain/operational-item-import";
import { parseResolveConflictFormData } from "@/modules/import/domain/reconciliation";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { persistImportWorkbook } from "@/modules/import/server/import-storage";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { getServerEnv } from "@/modules/platform/server/env";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import * as XLSX from "xlsx";
import { z } from "zod";

async function ensureCategoriaOperacional(nome: string) {
  if (!nome || nome.trim() === "") return;
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return;
  const nm = nome.trim();
  const ds = nm.slice(0, 50).replace(/\s+/g, "-").toUpperCase();
  await prisma.categoriaOperacional.upsert({
    where: { nm_categoria: nm },
    update: {},
    create: { ds_codigo: ds, nm_categoria: nm }
  }).catch(() => {
    // ignora conflito de ds_codigo duplicado — categoria já existe com outro nome mas mesmo código
  });
}

async function resolveImportActor() {
  try {
    return await requirePermission("import.run");
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return {
        userId: null,
        restaurantId: "rest_padrao",
        name: "Sistema",
        email: "system@sis-restaurante.local",
        roleCodes: ["admin"]
      };
    }

    throw error;
  }
}

export async function createImportExecutionAction(formData: FormData) {
  const actor = await resolveImportActor();
  const uploadedFile = formData.get("workbook");

  if (!(uploadedFile instanceof File) || uploadedFile.size <= 0) {
    redirect("/importacao?error=invalid_file");
  }

  if (!uploadedFile.name.toLowerCase().endsWith(".xlsx")) {
    redirect("/importacao?error=invalid_file");
  }

  let destination = "/importacao?error=upload_failed";

  try {
    const storedFile = await persistImportWorkbook(uploadedFile);
    const execution = await getImportRepository(actor.restaurantId).createImportExecution({
      originalFileName: storedFile.originalFileName,
      originalFilePath: storedFile.storedPath,
      fileHash: storedFile.fileHash,
      fileSizeBytes: storedFile.fileSizeBytes,
      mimeType: storedFile.mimeType,
      requestedByUserId: actor.userId
    });
    destination = `/importacao?created=1&execucao=${execution.id}`;
  } catch (error) {
    if (error instanceof ActiveImportExecutionError) {
      destination = "/importacao?error=active_execution";
    } else {
      console.error("[importacao] upload_failed", error);
    }
  }

  redirect(destination);
}

export async function cancelImportExecutionAction(formData: FormData) {
  const actor = await resolveImportActor();
  const executionId = formData.get("executionId")?.toString();

  if (!executionId) {
    redirect("/importacao?error=invalid_params");
  }

  const repository = getImportRepository(actor.restaurantId);

  try {
    const result = await repository.markImportExecutionCancelled(executionId);
    if (!result) {
      // Execução já concluída/cancelada antes do clique chegar ao servidor
      redirect("/importacao?error=already_finished");
    }
  } catch (error) {
    console.error("[importacao] cancel_failed", error);
    redirect("/importacao?error=cancel_failed");
  }

  redirect("/importacao?cancelled=1");
}

export async function createOperationalItemImportAction(formData: FormData) {
  const actor = await resolveImportActor();
  const uploadedFile = formData.get("operationalWorkbook");

  if (!(uploadedFile instanceof File) || uploadedFile.size <= 0) {
    redirect("/importacao?error=invalid_file");
  }

  if (!uploadedFile.name.toLowerCase().endsWith(".csv")) {
    redirect("/importacao?error=invalid_file");
  }

  const repository = getImportRepository(actor.restaurantId);
  let executionId = "";

  try {
    const storedFile = await persistImportWorkbook(uploadedFile);
    const execution = await repository.createImportExecution({
      originalFileName: storedFile.originalFileName,
      originalFilePath: storedFile.storedPath,
      fileHash: storedFile.fileHash,
      fileSizeBytes: storedFile.fileSizeBytes,
      mimeType: storedFile.mimeType,
      requestedByUserId: actor.userId
    });
    executionId = execution.id;

    await repository.markImportExecutionProcessing(execution.id, {
      stage: "carregando_banco",
      technicalDetails: {
        importMode: "operacional_itens"
      }
    });

    const parsed = parseOperationalItemsCsv(await uploadedFile.text());
    const catalogRepository = getCatalogRepository(actor.restaurantId);
    let itemsProcessed = 0;

    for (const row of parsed.rows.filter((entry) => entry.itemName && entry.type)) {
      const existingItems = await catalogRepository.listItems({
        page: 1,
        pageSize: 50,
        query: row.itemName,
        status: "all",
        type: "all"
      });
      const existingItem = existingItems.items.find(
        (item) => item.name.trim().toLowerCase() === row.itemName.trim().toLowerCase()
      );

      await catalogRepository.saveItem({
        id: existingItem?.id,
        code: existingItem?.code ?? "",
        name: row.itemName,
        type: row.type as Parameters<typeof catalogRepository.saveItem>[0]["type"],
        operationalCategory: row.operationalCategory || existingItem?.category || "Operacional",
        // Phase 08-04: stockUnit/usageUnit/conversionFactor top-level REMOVIDOS do contrato.
        // Unidades sao derivadas do purchase principal no repository.saveItem.
        description: row.descriptionFlag
          ? `Descricao operacional sinalizada pela importacao em ${row.updatedAt || "data nao informada"}.`
          : "Atualizacao operacional importada sem descricao detalhada.",
        active: true,
        purchases: [
          {
            supplierName: existingItem?.supplierName || "Importacao operacional",
            purchaseUnit: row.purchaseUnit || "un",
            purchaseIsPrimary: true,
            purchaseQuantity: row.purchaseQuantity || "1.0000",
            purchaseCost: row.purchaseCost || "0.0000",
            priceUpdatedAt: row.updatedAt || new Date().toISOString(),
            // D-17: default unidade_uso_id = unidade_compra_id, quantidade_uso = 1.
            usageUnit: row.purchaseUnit || "un",
            usageQuantity: "1.0000"
          }
        ]
      });

      itemsProcessed += 1;
    }

    await repository.markImportExecutionCompleted(execution.id, {
      stage: "concluida",
      friendlySummary: {
        headline: "Importacao operacional de itens concluida",
        whatHappened: `A atualizacao operacional foi aplicada ao arquivo ${uploadedFile.name}.`,
        impact: `${itemsProcessed} itens foram criados ou atualizados a partir do CSV operacional.`,
        whatToDoNow:
          "Revise o historico da execucao e siga com a operacao normal. Os itens ja estao disponiveis no cadastro mestre.",
        nextAction: {
          label: "Abrir itens",
          href: "/itens"
        }
      },
      technicalDetails: {
        importMode: "operacional_itens",
        mappedColumns: parsed.mapping
      },
      operationalSummary: {
        importMode: "operacional_itens",
        rowsReceived: parsed.rows.length,
        itemsImported: itemsProcessed
      }
    });
  } catch (error) {
    if (executionId) {
      await repository.markImportExecutionFailed(executionId, {
        stage: "falha",
        friendlySummary: {
          headline: "Falha na importacao operacional de itens",
          whatHappened: `Nao foi possivel processar o arquivo ${uploadedFile.name}.`,
          impact: "Nenhuma atualizacao adicional sera aplicada ate uma nova tentativa.",
          whatToDoNow: "Revise o CSV operacional e tente novamente.",
          technicalDetails: {
            code: "operational_items",
            message: error instanceof Error ? error.message : "Erro inesperado"
          }
        },
        technicalDetails: {
          importMode: "operacional_itens"
        }
      });
    }

    if (error instanceof ActiveImportExecutionError) {
      redirect("/importacao?error=active_execution");
    }

    redirect("/importacao?error=upload_failed");
  }

  redirect(`/importacao?created=1&operational=1&execucao=${executionId}`);
}

export async function resolveImportConflictAction(formData: FormData) {
  const actor = await resolveImportActor();
  const parsed = parseResolveConflictFormData(formData);

  if (!parsed.success) {
    redirect("/importacao/pendencias?error=resolve");
  }

  const result = await getImportRepository(actor.restaurantId).resolveConflict({
    conflictId: parsed.data.conflictId,
    targetItemId: parsed.data.targetItemId,
    alias: parsed.data.alias,
    applyToExecutionName: parsed.data.applyToExecutionName,
    actorId: actor.userId,
    actorName: actor.name
  });

  if (!result) {
    redirect("/importacao/pendencias?error=resolve");
  }

  const redirectTarget = parsed.data.executionId
    ? `/importacao/pendencias?resolved=1&execucao=${parsed.data.executionId}`
    : "/importacao/pendencias?resolved=1";

  redirect(redirectTarget);
}

const MappingSchema = z.record(z.string(), z.string());

export async function createMappedItemImportAction(formData: FormData) {
  const actor = await resolveImportActor();
  const file = formData.get("file") as File;
  const mappingJson = formData.get("mappingJson") as string;

  if (!file || file.size === 0 || !mappingJson) {
    redirect("/importacao/itens?error=invalid_params");
  }

  const mapping = MappingSchema.parse(JSON.parse(mappingJson));
  const defaultValuesJson = formData.get("defaultValuesJson") as string | null;
  const defaultValues: Record<string, string> = defaultValuesJson ? MappingSchema.parse(JSON.parse(defaultValuesJson)) : {};
  const repository = getImportRepository(actor.restaurantId);
  const catalogRepository = getCatalogRepository(actor.restaurantId);

  let executionId = "";

  try {
    const storedFile = await persistImportWorkbook(file);
    const execution = await repository.createImportExecution({
      originalFileName: storedFile.originalFileName,
      originalFilePath: storedFile.storedPath,
      fileHash: storedFile.fileHash,
      fileSizeBytes: storedFile.fileSizeBytes,
      mimeType: storedFile.mimeType,
      requestedByUserId: actor.userId
    });
    executionId = execution.id;

    await repository.markImportExecutionProcessing(execution.id, {
      stage: "processando_arquivo",
      technicalDetails: {
        importMode: "mapped_items",
        mapping
      }
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    // raw: true retorna o valor numérico real da célula (float) sem aplicar o
    // formato da planilha — evita que formatos PT-BR (ex: "0,00") façam o XLSX
    // dividir o valor por 1000 ou retornar string com símbolo de moeda.
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = (XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: "" }) as Record<string, unknown>[])
      .map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim(), v])));

    // Normaliza número para string com ponto decimal.
    // Aceita: JS number (raw: true), string PT-BR "1.234,56", string "10,00", string pura "10.00".
    const parseBrNumber = (value: unknown): string => {
      if (value === undefined || value === null || value === "") return "0";
      // Célula numérica do Excel (raw: true) — valor já é float JS, usa direto.
      if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
      // Célula de texto: remove símbolo de moeda e espaços antes de parsear.
      const str = String(value).trim().replace(/R\$\s?/g, "").trim();
      if (str === "") return "0";
      // Número puro com ponto decimal → retorna direto.
      if (/^-?\d+(\.\d+)?$/.test(str)) return str;
      // Formato BR com milhar e decimal: 1.234,56
      if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) return str.replace(/\./g, "").replace(",", ".");
      // Só vírgula decimal: 10,00
      if (/^\d+(,\d+)?$/.test(str)) return str.replace(",", ".");
      return str;
    };

    // Pre-carrega todos os itens existentes em 1 query para evitar N listItems por linha.
    const env = getServerEnv();
    const prismaForBulk = getPrismaClient(env.DATABASE_URL);
    type ExistingEntry = { id: string; code: string; category: string };
    const existingItemMap = new Map<string, ExistingEntry>();
    if (prismaForBulk) {
      const allExisting = await prismaForBulk.item.findMany({
        where: { cd_restaurante: actor.restaurantId },
        select: {
          cd_item: true,
          nm_item: true,
          ds_codigo_interno: true,
          nm_categoria_operacional: true
        }
      });
      for (const it of allExisting) {
        existingItemMap.set(it.nm_item.trim().toLowerCase(), {
          id: it.cd_item,
          code: it.ds_codigo_interno ?? "",
          category: it.nm_categoria_operacional ?? "Importado"
        });
      }
    }

    let itemsProcessed = 0;
    let itemsSkipped = 0;
    const processedItemNames = new Set<string>();

    for (const row of rows) {
      const getValue = (field: string) => {
        const columnName = mapping[field];
        if (columnName) return row[columnName];
        return defaultValues[field] ?? undefined;
      };

      const itemName = getValue("itemName");
      const type = getValue("type");

      if (!itemName || !type) { itemsSkipped++; continue; }

      let itemType = String(type).toLowerCase().trim() as Parameters<typeof catalogRepository.saveItem>[0]["type"];
      const validTypes = [
        "insumo", "pre_preparo", "intermediario", "produto_pronto",
        "prato", "porcao", "marmita", "combo", "embalagem", "apoio"
      ];
      if (!validTypes.includes(itemType)) itemType = "insumo";

      try {
        const existingItem = existingItemMap.get(String(itemName).trim().toLowerCase());

        const rawCode = getValue("internalCode");
        const rawCodeStr = rawCode !== undefined && rawCode !== null ? String(rawCode).trim() : "";
        const code = rawCodeStr !== "" && rawCodeStr !== "0" ? rawCodeStr : (existingItem?.code || "");
        const operationalCategory = String(getValue("operationalCategory") || existingItem?.category || "Importado");

        await ensureCategoriaOperacional(operationalCategory);

        await catalogRepository.saveItem({
          id: existingItem?.id,
          code,
          name: String(itemName),
          type: itemType,
          operationalCategory,
          description: `Importado via planilha em ${new Date().toLocaleString("pt-BR")}`,
          active: true,
          skipCascadeRecalculate: true,
          purchases: [
            {
              supplierName: String(getValue("supplierName") || "Importacao"),
              purchaseUnit: String(getValue("purchaseUnit") || "un"),
              purchaseIsPrimary: true,
              purchaseQuantity: parseBrNumber(getValue("purchaseQuantity") || "1"),
              purchaseCost: parseBrNumber(getValue("purchaseCost") || "0"),
              priceUpdatedAt: String(getValue("updatedAt") || new Date().toISOString()),
              usageUnit: String(getValue("usageUnit") || getValue("purchaseUnit") || "un"),
              usageQuantity: parseBrNumber(getValue("usageQuantity") || "1")
            }
          ]
        });

        processedItemNames.add(String(itemName).trim());
        itemsProcessed++;
      } catch (itemError) {
        console.error(`Import: erro ao salvar item "${itemName}":`, itemError);
        itemsSkipped++;
      }
    }

    // Recalcula custos em lote — uma única passagem para todos os itens salvos.
    if (processedItemNames.size > 0 && prismaForBulk) {
      const savedItems = await prismaForBulk.item.findMany({
        where: {
          cd_restaurante: actor.restaurantId,
          nm_item: { in: [...processedItemNames] }
        },
        select: { cd_item: true }
      });
      await catalogRepository.recalculateItems(savedItems.map(i => i.cd_item));
    }

    await repository.markImportExecutionCompleted(execution.id, {
      stage: "concluida",
      friendlySummary: {
        headline: "Importação concluída com sucesso",
        whatHappened: `Foram processadas ${rows.length} linhas do arquivo ${file.name}.`,
        impact: `${itemsProcessed} itens criados ou atualizados${itemsSkipped > 0 ? `, ${itemsSkipped} ignorados por erro ou dados insuficientes` : ""}.`,
        whatToDoNow: "Você pode revisar os itens importados no cadastro de materiais.",
        nextAction: {
          label: "Ver Itens",
          href: "/itens"
        }
      }
    });

  } catch (error) {
    console.error("Import error:", error);
    if (executionId) {
      await repository.markImportExecutionFailed(executionId, {
        stage: "falha",
        friendlySummary: {
          headline: "Falha na importação",
          whatHappened: "Ocorreu um erro ao processar as linhas do arquivo.",
          impact: "Alguns ou todos os itens podem não ter sido importados.",
          whatToDoNow: "Verifique o formato do arquivo e tente novamente."
        }
      });
    }
    redirect("/importacao/itens?error=process_failed");
  }

  redirect("/importacao?success=1");
}
