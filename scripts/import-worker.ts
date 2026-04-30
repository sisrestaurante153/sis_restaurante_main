import "dotenv/config";
import { execFile } from "node:child_process";
import os from "node:os";
import process from "node:process";
import { promisify } from "node:util";
import { importacao_status as ImportacaoStatus } from "@/generated/prisma/client";
import {
  buildFriendlyImportFailureSummary,
  buildFriendlyImportSuccessSummary
} from "@/modules/import/domain/import-execution";
import { buildImportDashboardSnapshot } from "@/modules/import/server/import-execution-presenter";
import { getImportRepository, type ImportExecutionRecord } from "@/modules/import/server/import-repository";
import { getExecutionArtifactPaths } from "@/modules/import/server/import-storage";
import { getServerEnv } from "@/modules/platform/server/env";
import { loadLegacyImportReport } from "./load-legacy-import";

const execFileAsync = promisify(execFile);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildWorkerMetadata() {
  return {
    workerId: `${os.hostname()}:${process.pid}`
  };
}

async function runPythonParser(execution: ImportExecutionRecord, artifacts: Awaited<ReturnType<typeof getExecutionArtifactPaths>>) {
  if (!execution.originalFilePath) {
    throw new Error("Arquivo original nao encontrado para a execucao.");
  }

  return execFileAsync(
    "python3",
    [
      "scripts/import_legacy_excel.py",
      "--workbook",
      execution.originalFilePath,
      "--output-dir",
      artifacts.directory
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPATH: process.env.PYTHONPATH ? `${process.env.PYTHONPATH}:vendor/python:.` : "vendor/python:."
      }
    }
  );
}

async function processPendingExecution(execution: ImportExecutionRecord) {
  const repository = getImportRepository();
  const workerMetadata = buildWorkerMetadata();
  const artifacts = await getExecutionArtifactPaths(execution.id);
  let currentStage = "parser_python";

  try {
    await repository.markImportExecutionProcessing(execution.id, {
      stage: "parser_python",
      technicalDetails: workerMetadata
    });

    const parserResult = await runPythonParser(execution, artifacts);

    currentStage = "carregando_banco";
    await repository.markImportExecutionProcessing(execution.id, {
      stage: "carregando_banco",
      technicalDetails: {
        ...workerMetadata,
        parserStdout: parserResult.stdout.trim() || null,
        parserStderr: parserResult.stderr.trim() || null
      }
    });

    const loadSummary = await loadLegacyImportReport({
      reportPath: artifacts.reportPath,
      executionId: execution.id
    });
    if (!("conflictsRecorded" in loadSummary)) {
      throw new Error("O loader retornou um preview em vez do resultado consolidado.");
    }
    const conflictCount = Number(loadSummary.conflictsRecorded ?? 0);
    const friendlySummary = buildFriendlyImportSuccessSummary({
      arquivo: execution.originalFileName,
      itemsProcessados: Number(loadSummary.itemsImported ?? 0),
      fichasProcessadas: Number(loadSummary.recipesImported ?? 0),
      conflitos: conflictCount
    });

    await repository.markImportExecutionCompleted(execution.id, {
      stage: "concluida",
      friendlySummary:
        conflictCount > 0
          ? {
              ...friendlySummary,
              nextAction: {
                label: "Abrir pendencias",
                href: `/importacao/pendencias?execucao=${execution.id}`
              }
            }
          : friendlySummary,
      technicalDetails: {
        ...workerMetadata,
        parserStdout: parserResult.stdout.trim() || null,
        parserStderr: parserResult.stderr.trim() || null
      },
      artifacts: {
        originalFilePath: execution.originalFilePath,
        reportPath: artifacts.reportPath,
        reportMarkdownPath: artifacts.reportMarkdownPath,
        conflictsPath: artifacts.conflictsPath,
        loadResultPath: artifacts.loadResultPath
      },
      operationalSummary: loadSummary,
      conflictCount
    });

    const completedExecution = await repository.getImportExecution(execution.id);

    if (completedExecution) {
      console.log(
        JSON.stringify(
          buildImportDashboardSnapshot({
            activeExecution: null,
            history: [completedExecution]
          }),
          null,
          2
        )
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no worker.";
    const stack = error instanceof Error ? error.stack ?? null : null;
    const failureCode = currentStage === "parser_python" ? "parser_python" : "prisma_load";

    try {
      await repository.markImportExecutionFailed(execution.id, {
        stage: "falha",
        friendlySummary: buildFriendlyImportFailureSummary({
          arquivo: execution.originalFileName,
          failureCode,
          technicalMessage: message
        }),
        technicalDetails: {
          ...workerMetadata,
          message,
          stack
        },
        artifacts: {
          originalFilePath: execution.originalFilePath,
          reportPath: artifacts.reportPath,
          reportMarkdownPath: artifacts.reportMarkdownPath,
          conflictsPath: artifacts.conflictsPath,
          loadResultPath: artifacts.loadResultPath
        }
      });
    } catch (failureUpdateError) {
      const failureUpdateMessage =
        failureUpdateError instanceof Error
          ? failureUpdateError.message
          : "Erro desconhecido ao registrar falha da execucao.";

      console.error(
        `[import-worker] nao foi possivel registrar a falha da execucao ${execution.id}: ${failureUpdateMessage}`
      );
    }

    console.error(`[import-worker] falha na execucao ${execution.id}: ${message}`);
  }
}

async function processOnePendingExecution() {
  const repository = getImportRepository();
  const activeExecution = await repository.getActiveImportExecution();

  if (!activeExecution) {
    return false;
  }

  if (activeExecution.status !== ImportacaoStatus.pendente) {
    return false;
  }

  await processPendingExecution(activeExecution);
  return true;
}

async function main() {
  const runOnce = process.argv.includes("--once");
  const env = getServerEnv();
  let keepRunning = true;

  while (keepRunning) {
    const processed = await processOnePendingExecution();
    if (runOnce) {
      keepRunning = false;
      continue;
    }

    if (!processed) {
      await sleep(env.IMPORT_WORKER_POLL_INTERVAL_MS);
    }
  }
}

void main();
