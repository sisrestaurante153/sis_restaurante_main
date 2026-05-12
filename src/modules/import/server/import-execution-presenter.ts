import type { FriendlyImportSummary } from "@/modules/import/domain/import-execution";
import type { ImportExecutionRecord } from "@/modules/import/server/import-repository";

export interface ImportExecutionSnapshot {
  id: string;
  originalFileName: string;
  originalFilePath: string | null;
  fileHash: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: string;
  currentStage: string;
  operationalSummary: Record<string, unknown> | null;
  friendlySummary: FriendlyImportSummary | null;
  technicalDetails: Record<string, unknown> | null;
  artifacts: Record<string, unknown> | null;
  requestedByUserId: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  conflictCount: number;
}

export interface ImportDashboardSnapshot {
  activeExecution: ImportExecutionSnapshot | null;
  latestResult: ImportExecutionSnapshot | null;
  history: ImportExecutionSnapshot[];
}

export function serializeImportExecution(
  execution: ImportExecutionRecord | ImportExecutionSnapshot
): ImportExecutionSnapshot {
  return {
    ...execution,
    createdAt:
      typeof execution.createdAt === "string" ? execution.createdAt : execution.createdAt.toISOString(),
    startedAt:
      execution.startedAt === null
        ? null
        : typeof execution.startedAt === "string"
          ? execution.startedAt
          : execution.startedAt.toISOString(),
    finishedAt:
      execution.finishedAt === null
        ? null
        : typeof execution.finishedAt === "string"
          ? execution.finishedAt
          : execution.finishedAt.toISOString()
  };
}

export function buildImportDashboardSnapshot(input: {
  activeExecution: ImportExecutionRecord | null;
  history: ImportExecutionRecord[];
}): ImportDashboardSnapshot {
  const serializedHistory = input.history.map(serializeImportExecution);
  const activeExecution = input.activeExecution ? serializeImportExecution(input.activeExecution) : null;
  const latestResult =
    serializedHistory.find((execution) => execution.status !== "pendente" && execution.status !== "processando") ??
    null;

  return {
    activeExecution,
    latestResult,
    history: serializedHistory
  };
}

export function getImportFeedbackMessage(params: {
  created?: string;
  error?: string;
  operational?: string;
  success?: string;
}) {
  if (params.success === "1") {
    return {
      severity: "success" as const,
      message: "Importação configurável concluída. Os itens já estão disponíveis no cadastro."
    };
  }

  if (params.created === "1") {
    if (params.operational === "1") {
      return {
        severity: "success" as const,
        message: "CSV operacional recebido e processado. A execução entrou no histórico da área de importação."
      };
    }

    return {
      severity: "success" as const,
      message: "Arquivo recebido. A execução entrou na fila e o status será atualizado automaticamente."
    };
  }

  if (params.error === "active_execution") {
    return {
      severity: "warning" as const,
      message: "Existe uma importação ativa. Aguarde a conclusão antes de enviar outro arquivo."
    };
  }

  if (params.error === "invalid_file") {
    return {
      severity: "error" as const,
      message: "Selecione um arquivo .xlsx válido para iniciar a importação."
    };
  }

  if (params.error === "upload_failed") {
    return {
      severity: "error" as const,
      message: "Não foi possível preparar o arquivo para importação. Tente novamente."
    };
  }

  return null;
}
