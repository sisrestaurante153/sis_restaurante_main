import {
  ImportacaoLinhaStatus,
  ImportacaoStatus,
  Prisma,
  type PrismaClient
} from "@/generated/prisma/client";
import {
  ActiveImportExecutionError,
  type FriendlyImportSummary,
  assertCanCreateImportExecution,
  getNextImportExecutionStatus
} from "@/modules/import/domain/import-execution";
import { normalizeAliasValue } from "@/modules/import/domain/reconciliation";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import {
  cloneDemoStore,
  createDemoId,
  getDemoStore,
  persistDemoStore,
  type DemoImportExecutionRecord
} from "@/modules/platform/server/demo-data";
import { getServerEnv } from "@/modules/platform/server/env";

const IMPORT_QUEUE_LOCK_SQL = "SELECT pg_advisory_xact_lock(902241)";

type ImportExecutionPayload = Prisma.ImportacaoExecucaoGetPayload<{
  include: {
    solicitadoPor: {
      select: {
        id: true;
        nome: true;
        email: true;
      };
    };
    _count: {
      select: {
        conflitos: true;
      };
    };
  };
}>;

export interface ImportExecutionRecord {
  id: string;
  originalFileName: string;
  originalFilePath: string | null;
  fileHash: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: ImportacaoStatus;
  currentStage: string;
  operationalSummary: Record<string, unknown> | null;
  friendlySummary: FriendlyImportSummary | null;
  technicalDetails: Record<string, unknown> | null;
  artifacts: Record<string, unknown> | null;
  requestedByUserId: string | null;
  requestedByName: string | null;
  requestedByEmail: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  conflictCount: number;
}

interface ImportExecutionFilters {
  status?: ImportacaoStatus;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

function asObject(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Prisma.JsonValue>;
}

function toPlainValue<T>(value: Prisma.JsonValue | null): T | null {
  if (value === null || value === undefined) {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function toJsonInput(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toNullableJsonInput(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return toJsonInput(value);
}

function readString(details: Record<string, Prisma.JsonValue> | null, key: string) {
  const value = details?.[key];
  return typeof value === "string" ? value : null;
}

function resolvePrismaClient() {
  const env = getServerEnv();
  return getPrismaClient(env.DATABASE_URL);
}

function mapImportExecution(execution: ImportExecutionPayload): ImportExecutionRecord {
  return {
    id: execution.id,
    originalFileName: execution.origemArquivo,
    originalFilePath: execution.origemArquivoCaminho ?? null,
    fileHash: execution.hashArquivo ?? null,
    mimeType: execution.mimeTypeArquivo ?? null,
    fileSizeBytes: execution.tamanhoArquivoBytes ?? null,
    status: execution.status,
    currentStage: execution.estagioAtual,
    operationalSummary: toPlainValue<Record<string, unknown>>(execution.resumoJson),
    friendlySummary: toPlainValue<FriendlyImportSummary>(execution.resumoAmigavelJson),
    technicalDetails: toPlainValue<Record<string, unknown>>(execution.detalhesTecnicosJson),
    artifacts: toPlainValue<Record<string, unknown>>(execution.artefatosJson),
    requestedByUserId: execution.solicitadoPorId ?? null,
    requestedByName: execution.solicitadoPor?.nome ?? null,
    requestedByEmail: execution.solicitadoPor?.email ?? null,
    createdAt: execution.criadoEm,
    startedAt: execution.iniciadoEm ?? null,
    finishedAt: execution.finalizadoEm ?? null,
    conflictCount: execution._count.conflitos
  };
}

function mapDemoExecution(execution: DemoImportExecutionRecord): ImportExecutionRecord {
  return {
    id: execution.id,
    originalFileName: execution.originalFileName,
    originalFilePath: execution.originalFilePath,
    fileHash: execution.fileHash,
    mimeType: execution.mimeType,
    fileSizeBytes: execution.fileSizeBytes,
    status: execution.status as ImportacaoStatus,
    currentStage: execution.currentStage,
    operationalSummary: execution.operationalSummary,
    friendlySummary: execution.friendlySummary,
    technicalDetails: execution.technicalDetails,
    artifacts: execution.artifacts,
    requestedByUserId: execution.requestedByUserId,
    requestedByName: execution.requestedByName,
    requestedByEmail: null,
    createdAt: new Date(execution.createdAt),
    startedAt: execution.startedAt ? new Date(execution.startedAt) : null,
    finishedAt: execution.finishedAt ? new Date(execution.finishedAt) : null,
    conflictCount: execution.conflictCount
  };
}

async function withImportQueueLock<T>(
  prisma: PrismaClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(IMPORT_QUEUE_LOCK_SQL);
    return callback(tx);
  });
}

function importExecutionInclude() {
  return {
    solicitadoPor: {
      select: {
        id: true,
        nome: true,
        email: true
      }
    },
    _count: {
      select: {
        conflitos: true
      }
    }
  } satisfies Prisma.ImportacaoExecucaoInclude;
}

async function findActiveExecutionTx(tx: Prisma.TransactionClient) {
  return tx.importacaoExecucao.findFirst({
    where: {
      status: {
        in: [ImportacaoStatus.pendente, ImportacaoStatus.processando]
      }
    },
    orderBy: [{ criadoEm: "asc" }]
  });
}

async function findExecutionByIdTx(tx: Prisma.TransactionClient, executionId: string) {
  return tx.importacaoExecucao.findUnique({
    where: { id: executionId }
  });
}

function mergePlainObject(
  currentValue: Prisma.JsonValue | null,
  incomingValue?: Record<string, unknown> | null
) {
  if (incomingValue === undefined) {
    return currentValue === null ? undefined : toNullableJsonInput(toPlainValue(currentValue));
  }

  if (incomingValue === null) {
    return Prisma.JsonNull;
  }

  const current = toPlainValue<Record<string, unknown>>(currentValue) ?? {};
  return toJsonInput({
    ...current,
    ...incomingValue
  });
}

async function listPendingConflictsWithPrisma(input?: { executionId?: string }) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const conflicts = await prisma.importacaoConflito.findMany({
      where: {
        resolvido: false,
        ...(input?.executionId ? { execucaoId: input.executionId } : {})
      },
      orderBy: [{ criadoEm: "desc" }, { rowNumber: "asc" }],
      include: {
        staging: true
      }
    });

    return conflicts.map((conflict) => {
      const details = asObject(conflict.detalhesJson);

      return {
        id: conflict.id,
        executionId: conflict.execucaoId,
        type: conflict.tipo,
        rawName: conflict.rawName ?? "",
        normalizedName: conflict.normalizedName ?? "",
        sheetName: conflict.sheetName ?? "",
        rowNumber: conflict.rowNumber ?? 0,
        confidence: conflict.confidence?.toFixed(4) ?? "0.0000",
        suggestedItemName: readString(details, "best_candidate"),
        suggestedAlias: readString(details, "raw_name"),
        stagingStatus: conflict.staging?.status ?? "conflict"
      };
    });
  } catch {
    return null;
  }
}

async function resolveConflictWithPrisma(input: {
  conflictId: string;
  targetItemId: string;
  alias?: string;
  applyToExecutionName?: boolean;
  actorId: string | null;
  actorName: string;
}) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const actorUser = input.actorId
        ? await tx.user.findUnique({
            where: { id: input.actorId },
            select: { id: true }
          })
        : null;
      const conflict = await tx.importacaoConflito.findUnique({
        where: { id: input.conflictId },
        include: {
          staging: true
        }
      });

      if (!conflict) {
        throw new Error(`Conflito ${input.conflictId} nao encontrado.`);
      }

      const item = await tx.item.findUnique({
        where: { id: input.targetItemId }
      });

      if (!item) {
        throw new Error(`Item ${input.targetItemId} nao encontrado.`);
      }

      const aliasSource = input.alias?.trim() || conflict.rawName || conflict.normalizedName || null;
      const conflictName = conflict.normalizedName ?? conflict.rawName;
      const conflictsToResolve =
        input.applyToExecutionName && conflict.execucaoId && conflictName
          ? await tx.importacaoConflito.findMany({
              where: {
                execucaoId: conflict.execucaoId,
                resolvido: false,
                OR: conflict.normalizedName
                  ? [{ normalizedName: conflict.normalizedName }]
                  : [{ rawName: conflict.rawName }]
              },
              include: {
                staging: true
              }
            })
          : [conflict];

      if (aliasSource) {
        await tx.itemAlias.upsert({
          where: {
            itemId_aliasNormalizado: {
              itemId: item.id,
              aliasNormalizado: normalizeAliasValue(aliasSource)
            }
          },
          update: {
            alias: aliasSource,
            origem: "reconciliacao_manual_ui"
          },
          create: {
            itemId: item.id,
            alias: aliasSource,
            aliasNormalizado: normalizeAliasValue(aliasSource),
            origem: "reconciliacao_manual_ui"
          }
        });
      }

      const stagingIds = conflictsToResolve
        .map((entry) => entry.stagingId)
        .filter((value): value is string => Boolean(value));

      if (stagingIds.length > 0) {
        await tx.importacaoStaging.updateMany({
          where: {
            id: {
              in: stagingIds
            }
          },
          data: {
            itemId: item.id,
            status: ImportacaoLinhaStatus.imported
          }
        });
      }

      for (const entry of conflictsToResolve) {
        const currentDetails = asObject(entry.detalhesJson) ?? {};

        await tx.importacaoConflito.update({
          where: { id: entry.id },
          data: {
            resolvido: true,
            detalhesJson: {
              ...currentDetails,
              resolucaoManual: {
                itemId: item.id,
                itemNome: item.nome,
                aliasAplicado: aliasSource,
                aplicadaEmLote: conflictsToResolve.length > 1
              }
            }
          }
        });
      }

      await tx.auditoria.create({
        data: {
          usuarioId: actorUser?.id ?? null,
          entidade: "importacao_conflito",
          entidadeId: conflict.id,
          acao: "import.conflict.reconciled.via_ui",
          depoisJson: {
            conflictId: conflict.id,
            itemId: item.id,
            itemNome: item.nome,
            aliasAplicado: aliasSource,
            resolvedConflictCount: conflictsToResolve.length,
            actorName: input.actorName
          }
        }
      });

      return {
        conflictId: conflict.id,
        itemId: item.id,
        itemName: item.nome,
        alias: aliasSource,
        resolvedConflictCount: conflictsToResolve.length
      };
    });
  } catch {
    return null;
  }
}

async function listImportExecutionsWithPrisma(filters?: ImportExecutionFilters) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const executions = await prisma.importacaoExecucao.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.dateFrom || filters?.dateTo
          ? {
              criadoEm: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {})
              }
            }
          : {})
      },
      orderBy: [{ criadoEm: "desc" }],
      take: filters?.limit,
      include: importExecutionInclude()
    });

    return executions.map(mapImportExecution);
  } catch {
    return null;
  }
}

async function getImportExecutionWithPrisma(id: string) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const execution = await prisma.importacaoExecucao.findUnique({
      where: { id },
      include: importExecutionInclude()
    });

    return execution ? mapImportExecution(execution) : null;
  } catch {
    return null;
  }
}

async function getActiveImportExecutionWithPrisma() {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const execution = await prisma.importacaoExecucao.findFirst({
      where: {
        status: {
          in: [ImportacaoStatus.pendente, ImportacaoStatus.processando]
        }
      },
      orderBy: [{ criadoEm: "asc" }],
      include: importExecutionInclude()
    });

    return execution ? mapImportExecution(execution) : null;
  } catch {
    return null;
  }
}

async function createImportExecutionWithPrisma(input: {
  originalFileName: string;
  originalFilePath: string;
  fileHash: string;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  requestedByUserId?: string | null;
}) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  return withImportQueueLock(prisma, async (tx) => {
    const activeExecution = await findActiveExecutionTx(tx);
    assertCanCreateImportExecution(activeExecution);
    const requestingUser = input.requestedByUserId
      ? await tx.user.findUnique({
          where: { id: input.requestedByUserId },
          select: { id: true }
        })
      : null;

    const execution = await tx.importacaoExecucao.create({
      data: {
        origemArquivo: input.originalFileName,
        origemArquivoCaminho: input.originalFilePath,
        hashArquivo: input.fileHash,
        mimeTypeArquivo: input.mimeType ?? null,
        tamanhoArquivoBytes: input.fileSizeBytes ?? null,
        status: ImportacaoStatus.pendente,
        estagioAtual: "aguardando_worker",
        artefatosJson: toJsonInput({
          originalFilePath: input.originalFilePath
        }),
        solicitadoPorId: requestingUser?.id ?? null
      },
      include: importExecutionInclude()
    });

    return mapImportExecution(execution);
  });
}

async function markImportExecutionProcessingWithPrisma(
  executionId: string,
  input: {
    stage: string;
    technicalDetails?: Record<string, unknown> | null;
  }
) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  return withImportQueueLock(prisma, async (tx) => {
    const current = await findExecutionByIdTx(tx, executionId);

    if (!current) {
      return null;
    }

    const execution = await tx.importacaoExecucao.update({
      where: { id: executionId },
      data: {
        status:
          current.status === ImportacaoStatus.pendente
            ? getNextImportExecutionStatus(current.status, "start_processing")
            : current.status,
        estagioAtual: input.stage,
        iniciadoEm: current.iniciadoEm ?? new Date(),
        detalhesTecnicosJson: mergePlainObject(current.detalhesTecnicosJson, input.technicalDetails)
      },
      include: importExecutionInclude()
    });

    return mapImportExecution(execution);
  });
}

async function markImportExecutionCompletedWithPrisma(
  executionId: string,
  input: {
    stage: string;
    friendlySummary: FriendlyImportSummary;
    technicalDetails?: Record<string, unknown> | null;
    artifacts?: Record<string, unknown> | null;
    operationalSummary?: Record<string, unknown> | null;
    conflictCount?: number;
  }
) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  return withImportQueueLock(prisma, async (tx) => {
    const current = await findExecutionByIdTx(tx, executionId);

    if (!current) {
      return null;
    }
    const hasConflicts = (input.conflictCount ?? 0) > 0;

    const execution = await tx.importacaoExecucao.update({
      where: { id: executionId },
      data: {
        status: getNextImportExecutionStatus(
          current.status,
          hasConflicts ? "complete_with_conflicts" : "complete"
        ),
        estagioAtual: input.stage,
        resumoJson:
          input.operationalSummary === undefined
            ? undefined
            : toNullableJsonInput(input.operationalSummary),
        resumoAmigavelJson: toJsonInput(input.friendlySummary),
        detalhesTecnicosJson: mergePlainObject(current.detalhesTecnicosJson, input.technicalDetails),
        artefatosJson: mergePlainObject(current.artefatosJson, input.artifacts),
        finalizadoEm: new Date()
      },
      include: importExecutionInclude()
    });

    return mapImportExecution(execution);
  });
}

async function markImportExecutionFailedWithPrisma(
  executionId: string,
  input: {
    stage: string;
    friendlySummary: FriendlyImportSummary;
    technicalDetails?: Record<string, unknown> | null;
    artifacts?: Record<string, unknown> | null;
    operationalSummary?: Record<string, unknown> | null;
  }
) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  return withImportQueueLock(prisma, async (tx) => {
    const current = await findExecutionByIdTx(tx, executionId);

    if (!current) {
      return null;
    }

    const execution = await tx.importacaoExecucao.update({
      where: { id: executionId },
      data: {
        status: getNextImportExecutionStatus(current.status, "fail"),
        estagioAtual: input.stage,
        resumoJson:
          input.operationalSummary === undefined
            ? undefined
            : toNullableJsonInput(input.operationalSummary),
        resumoAmigavelJson: toJsonInput(input.friendlySummary),
        detalhesTecnicosJson: mergePlainObject(current.detalhesTecnicosJson, input.technicalDetails),
        artefatosJson: mergePlainObject(current.artefatosJson, input.artifacts),
        finalizadoEm: new Date()
      },
      include: importExecutionInclude()
    });

    return mapImportExecution(execution);
  });
}

function listImportExecutionsFromDemo(filters?: ImportExecutionFilters) {
  return getDemoStore().importExecutions
    .filter((execution) => (filters?.status ? execution.status === filters.status : true))
    .filter((execution) =>
      filters?.dateFrom ? new Date(execution.createdAt) >= filters.dateFrom : true
    )
    .filter((execution) => (filters?.dateTo ? new Date(execution.createdAt) <= filters.dateTo : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, filters?.limit ?? Number.MAX_SAFE_INTEGER)
    .map((execution) => mapDemoExecution(cloneDemoStore(execution)));
}

function getImportExecutionFromDemo(id: string) {
  const execution = getDemoStore().importExecutions.find((entry) => entry.id === id);
  return execution ? mapDemoExecution(cloneDemoStore(execution)) : null;
}

function getActiveImportExecutionFromDemo() {
  const execution = getDemoStore().importExecutions.find(
    (entry) => entry.status === "pendente" || entry.status === "processando"
  );
  return execution ? mapDemoExecution(cloneDemoStore(execution)) : null;
}

function createImportExecutionInDemo(input: {
  originalFileName: string;
  originalFilePath: string;
  fileHash: string;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  requestedByUserId?: string | null;
}) {
  const store = getDemoStore();
  const activeExecution = store.importExecutions.find(
    (entry) => entry.status === "pendente" || entry.status === "processando"
  );

  if (activeExecution) {
    throw new ActiveImportExecutionError({
      id: activeExecution.id,
      status: activeExecution.status as ImportacaoStatus,
      arquivo: activeExecution.originalFileName
    });
  }

  const requestingUser =
    input.requestedByUserId
      ? store.users.find((user) => user.id === input.requestedByUserId) ?? null
      : null;
  const createdAt = new Date().toISOString();
  const execution: DemoImportExecutionRecord = {
    id: createDemoId("import-execution"),
    originalFileName: input.originalFileName,
    originalFilePath: input.originalFilePath,
    fileHash: input.fileHash,
    mimeType: input.mimeType ?? null,
    fileSizeBytes: input.fileSizeBytes ?? null,
    status: "pendente",
    currentStage: "aguardando_worker",
    friendlySummary: null,
    technicalDetails: null,
    artifacts: {
      originalFilePath: input.originalFilePath
    },
    operationalSummary: null,
    requestedByUserId: requestingUser?.id ?? null,
    requestedByName: requestingUser?.nome ?? null,
    createdAt,
    startedAt: null,
    finishedAt: null,
    conflictCount: 0
  };

  store.importExecutions.unshift(execution);
  persistDemoStore(store);
  return mapDemoExecution(execution);
}

function updateDemoExecution(
  executionId: string,
  updater: (execution: DemoImportExecutionRecord) => DemoImportExecutionRecord
) {
  const store = getDemoStore();
  const index = store.importExecutions.findIndex((entry) => entry.id === executionId);

  if (index === -1) {
    return null;
  }

  const updated = updater(store.importExecutions[index]);
  store.importExecutions[index] = updated;
  persistDemoStore(store);
  return mapDemoExecution(updated);
}

export function getImportRepository() {
  return {
    async createImportExecution(input: {
      originalFileName: string;
      originalFilePath: string;
      fileHash: string;
      fileSizeBytes?: number | null;
      mimeType?: string | null;
      requestedByUserId?: string | null;
    }) {
      const prismaResult = await createImportExecutionWithPrisma(input);
      if (prismaResult) {
        return prismaResult;
      }

      return createImportExecutionInDemo(input);
    },

    async listImportExecutions(filters?: ImportExecutionFilters) {
      const prismaResult = await listImportExecutionsWithPrisma(filters);
      if (prismaResult) {
        return prismaResult;
      }

      return listImportExecutionsFromDemo(filters);
    },

    async getImportExecution(id: string) {
      const prismaResult = await getImportExecutionWithPrisma(id);
      if (prismaResult) {
        return prismaResult;
      }

      return getImportExecutionFromDemo(id);
    },

    async getActiveImportExecution() {
      const prismaResult = await getActiveImportExecutionWithPrisma();
      if (prismaResult) {
        return prismaResult;
      }

      return getActiveImportExecutionFromDemo();
    },

    async markImportExecutionProcessing(
      executionId: string,
      input: {
        stage: string;
        technicalDetails?: Record<string, unknown> | null;
      }
    ) {
      const prismaResult = await markImportExecutionProcessingWithPrisma(executionId, input);
      if (prismaResult) {
        return prismaResult;
      }

      return updateDemoExecution(executionId, (execution) => ({
        ...execution,
        status:
          execution.status === ImportacaoStatus.pendente
            ? getNextImportExecutionStatus(
                execution.status as ImportacaoStatus,
                "start_processing"
              )
            : execution.status,
        currentStage: input.stage,
        technicalDetails: {
          ...(execution.technicalDetails ?? {}),
          ...(input.technicalDetails ?? {})
        },
        startedAt: execution.startedAt ?? new Date().toISOString()
      }));
    },

    async markImportExecutionCompleted(
      executionId: string,
      input: {
        stage: string;
        friendlySummary: FriendlyImportSummary;
        technicalDetails?: Record<string, unknown> | null;
        artifacts?: Record<string, unknown> | null;
        operationalSummary?: Record<string, unknown> | null;
        conflictCount?: number;
      }
    ) {
      const prismaResult = await markImportExecutionCompletedWithPrisma(executionId, input);
      if (prismaResult) {
        return prismaResult;
      }

      return updateDemoExecution(executionId, (execution) => ({
        ...execution,
        status: getNextImportExecutionStatus(
          execution.status as ImportacaoStatus,
          (input.conflictCount ?? 0) > 0 ? "complete_with_conflicts" : "complete"
        ),
        currentStage: input.stage,
        friendlySummary: input.friendlySummary,
        technicalDetails: {
          ...(execution.technicalDetails ?? {}),
          ...(input.technicalDetails ?? {})
        },
        artifacts: {
          ...(execution.artifacts ?? {}),
          ...(input.artifacts ?? {})
        },
        operationalSummary: input.operationalSummary ?? execution.operationalSummary,
        finishedAt: new Date().toISOString(),
        conflictCount: input.conflictCount ?? execution.conflictCount
      }));
    },

    async markImportExecutionFailed(
      executionId: string,
      input: {
        stage: string;
        friendlySummary: FriendlyImportSummary;
        technicalDetails?: Record<string, unknown> | null;
        artifacts?: Record<string, unknown> | null;
        operationalSummary?: Record<string, unknown> | null;
      }
    ) {
      const prismaResult = await markImportExecutionFailedWithPrisma(executionId, input);
      if (prismaResult) {
        return prismaResult;
      }

      return updateDemoExecution(executionId, (execution) => ({
        ...execution,
        status: getNextImportExecutionStatus(execution.status as ImportacaoStatus, "fail"),
        currentStage: input.stage,
        friendlySummary: input.friendlySummary,
        technicalDetails: {
          ...(execution.technicalDetails ?? {}),
          ...(input.technicalDetails ?? {})
        },
        artifacts: {
          ...(execution.artifacts ?? {}),
          ...(input.artifacts ?? {})
        },
        operationalSummary: input.operationalSummary ?? execution.operationalSummary,
        finishedAt: new Date().toISOString()
      }));
    },

    async listPendingConflicts(input?: { executionId?: string }) {
      const prismaResult = await listPendingConflictsWithPrisma(input);
      if (prismaResult) {
        return prismaResult;
      }

      return getDemoStore().importConflicts
        .filter((conflict) => !conflict.resolved)
        .map((conflict) => ({
          ...cloneDemoStore(conflict),
          executionId: null,
          stagingStatus: "conflict"
        }));
    },

    async resolveConflict(input: {
      conflictId: string;
      targetItemId: string;
      alias?: string;
      applyToExecutionName?: boolean;
      actorId: string | null;
      actorName: string;
    }) {
      const prismaResult = await resolveConflictWithPrisma(input);
      if (prismaResult) {
        return prismaResult;
      }

      const store = getDemoStore();
      const conflict = store.importConflicts.find((entry) => entry.id === input.conflictId);
      const item = store.items.find((entry) => entry.id === input.targetItemId);

      if (!conflict || !item) {
        return null;
      }

      conflict.resolved = true;
      if (input.alias?.trim()) {
        item.aliases.unshift(input.alias.trim());
      }
      persistDemoStore(store);

      return {
        conflictId: conflict.id,
        itemId: item.id,
        itemName: item.name,
        alias: input.alias?.trim() || conflict.rawName || null,
        resolvedConflictCount: 1
      };
    }
  };
}
