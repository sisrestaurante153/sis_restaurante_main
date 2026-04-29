import { ImportacaoStatus } from "@/generated/prisma/client";

export type ImportExecutionStage =
  | "aguardando_worker"
  | "parser_python"
  | "carregando_banco"
  | "consolidando_resultado"
  | "concluida"
  | "falha";

export type ImportExecutionEvent =
  | "start_processing"
  | "complete"
  | "complete_with_conflicts"
  | "fail";

export interface FriendlyImportSummary {
  headline: string;
  whatHappened: string;
  impact: string;
  whatToDoNow: string;
  nextAction?: {
    label: string;
    href: string;
  } | null;
  technicalDetails?: {
    code?: string;
    message?: string | null;
  } | null;
}

export type ImportFailureCode = "parser_python" | "prisma_load" | "storage" | "unknown";

export class ActiveImportExecutionError extends Error {
  readonly executionId: string;
  readonly executionStatus: ImportacaoStatus;
  readonly fileName: string;

  constructor(input: { id: string; status: ImportacaoStatus; arquivo: string }) {
    super(
      `Ja existe uma importacao ativa (${input.id}) para o arquivo ${input.arquivo}. Aguarde a conclusao antes de enviar outro XLSX.`
    );
    this.name = "ActiveImportExecutionError";
    this.executionId = input.id;
    this.executionStatus = input.status;
    this.fileName = input.arquivo;
  }
}

export class InvalidImportExecutionTransitionError extends Error {
  constructor(currentStatus: ImportacaoStatus, event: ImportExecutionEvent) {
    super(`Transicao invalida para importacao: ${currentStatus} -> ${event}`);
    this.name = "InvalidImportExecutionTransitionError";
  }
}

export function isImportExecutionActive(status: ImportacaoStatus) {
  return status === ImportacaoStatus.pendente || status === ImportacaoStatus.processando;
}

export function assertCanCreateImportExecution(
  activeExecution:
    | {
        id: string;
        status: ImportacaoStatus;
        origemArquivo: string;
      }
    | null
) {
  if (activeExecution && isImportExecutionActive(activeExecution.status)) {
    throw new ActiveImportExecutionError({
      id: activeExecution.id,
      status: activeExecution.status,
      arquivo: activeExecution.origemArquivo
    });
  }
}

export function getNextImportExecutionStatus(
  currentStatus: ImportacaoStatus,
  event: ImportExecutionEvent
) {
  if (currentStatus === ImportacaoStatus.pendente && event === "start_processing") {
    return ImportacaoStatus.processando;
  }

  if (currentStatus === ImportacaoStatus.processando && event === "complete") {
    return ImportacaoStatus.concluida;
  }

  if (currentStatus === ImportacaoStatus.processando && event === "complete_with_conflicts") {
    return ImportacaoStatus.concluida_com_conflitos;
  }

  if (currentStatus === ImportacaoStatus.processando && event === "fail") {
    return ImportacaoStatus.falha;
  }

  throw new InvalidImportExecutionTransitionError(currentStatus, event);
}

export function buildFriendlyImportSuccessSummary(input: {
  arquivo: string;
  itemsProcessados: number;
  fichasProcessadas: number;
  conflitos: number;
}): FriendlyImportSummary {
  if (input.conflitos > 0) {
    return {
      headline: "Importacao concluida com pendencias",
      whatHappened: `A importacao foi concluida para ${input.arquivo}, mas alguns nomes e composicoes precisam de reconciliacao manual.`,
      impact: `${input.itemsProcessados} itens e ${input.fichasProcessadas} fichas foram processados. Ha ${input.conflitos} pendencias para revisar antes de considerar a carga totalmente reconciliada.`,
      whatToDoNow:
        "Revise as pendencias de importacao, confirme os itens sugeridos e finalize a reconciliacao manual.",
      nextAction: {
        label: "Abrir pendencias",
        href: "/importacao/pendencias"
      }
    };
  }

  return {
    headline: "Importacao concluida",
    whatHappened: `A importacao de ${input.arquivo} foi concluida sem conflitos operacionais.`,
    impact: `${input.itemsProcessados} itens e ${input.fichasProcessadas} fichas foram atualizados na base.`,
    whatToDoNow: "Siga com a operacao normal. O historico desta execucao permanece disponivel para auditoria.",
    nextAction: null
  };
}

export function buildFriendlyImportFailureSummary(input: {
  arquivo: string;
  failureCode: ImportFailureCode;
  technicalMessage?: string | null;
}): FriendlyImportSummary {
  const technicalDetails = {
    code: input.failureCode,
    message: input.technicalMessage ?? null
  };

  if (input.failureCode === "parser_python") {
    return {
      headline: "Nao foi possivel ler o arquivo enviado",
      whatHappened: `O processo nao conseguiu ler o arquivo ${input.arquivo} como uma planilha legada valida.`,
      impact: "Nenhum dado novo foi aplicado na base. O arquivo original foi preservado para auditoria e reprocessamento.",
      whatToDoNow:
        "Revise o arquivo XLSX enviado, confirme se ele nao esta corrompido e tente uma nova importacao.",
      technicalDetails
    };
  }

  if (input.failureCode === "prisma_load") {
    return {
      headline: "A leitura do arquivo terminou, mas a carga nao foi aplicada",
      whatHappened:
        "O parser concluiu a etapa inicial, mas a consolidacao no banco falhou antes do fechamento da execucao.",
      impact: "Os dados anteriores permanecem valendo. O arquivo e os artefatos desta tentativa ficaram salvos para analise.",
      whatToDoNow:
        "Tente novamente depois da correcao operacional ou encaminhe os detalhes tecnicos para o administrador responsável.",
      technicalDetails
    };
  }

  if (input.failureCode === "storage") {
    return {
      headline: "Nao foi possivel preparar os arquivos da importacao",
      whatHappened:
        "O sistema nao conseguiu salvar ou localizar os arquivos operacionais necessarios para processar a execucao.",
      impact: "A importacao foi interrompida antes de qualquer atualizacao na base.",
      whatToDoNow:
        "Tente novamente e, se o problema persistir, verifique o storage compartilhado com a equipe tecnica.",
      technicalDetails
    };
  }

  return {
    headline: "A importacao foi interrompida",
    whatHappened: `A execucao do arquivo ${input.arquivo} encontrou um erro inesperado durante o processamento.`,
    impact: "O sistema preservou o arquivo original e nao concluiu a atualizacao planejada.",
    whatToDoNow:
      "Consulte os detalhes tecnicos da execucao e refaça o envio quando a causa estiver resolvida.",
    technicalDetails
  };
}
