"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/access/server/authorization";
import { ActiveImportExecutionError } from "@/modules/import/domain/import-execution";
import { parseOperationalItemsCsv } from "@/modules/import/domain/operational-item-import";
import { parseResolveConflictFormData } from "@/modules/import/domain/reconciliation";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { persistImportWorkbook } from "@/modules/import/server/import-storage";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import * as XLSX from "xlsx";
import { z } from "zod";

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
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    let itemsProcessed = 0;

    for (const row of rows) {
      const getValue = (field: string) => {
        const columnName = mapping[field];
        return columnName ? row[columnName] : undefined;
      };

      const itemName = getValue("itemName");
      const type = getValue("type");

      if (!itemName || !type) continue;

      // Basic cleanup for type
      let itemType = String(type).toLowerCase().trim() as Parameters<typeof catalogRepository.saveItem>[0]["type"];
      const validTypes = [
        "insumo", "pre_preparo", "intermediario", "produto_pronto", 
        "prato", "porcao", "marmita", "combo", "embalagem", "apoio"
      ];
      if (!validTypes.includes(itemType)) {
        itemType = "insumo"; // fallback
      }

      const existingItems = await catalogRepository.listItems({
        page: 1,
        pageSize: 10,
        query: String(itemName),
        status: "all",
        type: "all"
      });

      const existingItem = existingItems.items.find(
        (item) => item.name.trim().toLowerCase() === String(itemName).trim().toLowerCase()
      );

      await catalogRepository.saveItem({
        id: existingItem?.id,
        code: String(getValue("internalCode") || existingItem?.code || ""),
        name: String(itemName),
        type: itemType,
        operationalCategory: String(getValue("operationalCategory") || existingItem?.category || "Importado"),
        description: `Importado via mapeamento customizado em ${new Date().toLocaleString("pt-BR")}`,
        active: true,
        purchases: [
          {
            supplierName: String(getValue("supplierName") || "Importacao"),
            purchaseUnit: String(getValue("purchaseUnit") || "un"),
            purchaseIsPrimary: true,
            purchaseQuantity: String(getValue("purchaseQuantity") || "1"),
            purchaseCost: String(getValue("purchaseCost") || "0"),
            priceUpdatedAt: String(getValue("updatedAt") || new Date().toISOString()),
            usageUnit: String(getValue("usageUnit") || getValue("purchaseUnit") || "un"),
            usageQuantity: String(getValue("usageQuantity") || "1")
          }
        ]
      });

      itemsProcessed++;
    }

    await repository.markImportExecutionCompleted(execution.id, {
      stage: "concluida",
      friendlySummary: {
        headline: "Importação concluída com sucesso",
        whatHappened: `Foram processadas ${rows.length} linhas do arquivo ${file.name}.`,
        impact: `${itemsProcessed} itens foram criados ou atualizados.`,
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
