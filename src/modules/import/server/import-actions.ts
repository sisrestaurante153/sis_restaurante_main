"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/access/server/authorization";
import { ActiveImportExecutionError } from "@/modules/import/domain/import-execution";
import { parseOperationalItemsCsv } from "@/modules/import/domain/operational-item-import";
import { parseResolveConflictFormData } from "@/modules/import/domain/reconciliation";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { persistImportWorkbook } from "@/modules/import/server/import-storage";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";

async function resolveImportActor() {
  try {
    return await requirePermission("import.run");
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return {
        userId: null,
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
    const execution = await getImportRepository().createImportExecution({
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

  const repository = getImportRepository();
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
    const catalogRepository = getCatalogRepository();
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

  const result = await getImportRepository().resolveConflict({
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
