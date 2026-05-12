import {
  importacao_linha_status,
  importacao_status,
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
        cd_usuario: true;
        nm_usuario: true;
        ds_email: true;
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
  status: importacao_status;
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
  status?: importacao_status;
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
    id: execution.cd_importacao,
    originalFileName: execution.ds_origem_arquivo,
    originalFilePath: execution.ds_caminho_arquivo ?? null,
    fileHash: execution.ds_hash ?? null,
    mimeType: execution.ds_mime_type ?? null,
    fileSizeBytes: execution.nr_tamanho_bytes ?? null,
    status: execution.tp_status,
    currentStage: execution.ds_estagio_atual,
    operationalSummary: toPlainValue<Record<string, unknown>>(execution.js_resumo),
    friendlySummary: toPlainValue<FriendlyImportSummary>(execution.js_resumo_amigavel),
    technicalDetails: toPlainValue<Record<string, unknown>>(execution.js_detalhes_tecnicos),
    artifacts: toPlainValue<Record<string, unknown>>(execution.js_artefatos),
    requestedByUserId: execution.cd_solicitante ?? null,
    requestedByName: execution.solicitadoPor?.nm_usuario ?? null,
    requestedByEmail: execution.solicitadoPor?.ds_email ?? null,
    createdAt: execution.ts_criacao,
    startedAt: execution.ts_inicio ?? null,
    finishedAt: execution.ts_fim ?? null,
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
    status: execution.status as importacao_status,
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
        cd_usuario: true,
        nm_usuario: true,
        ds_email: true
      }
    },
    _count: {
      select: {
        conflitos: true
      }
    }
  } satisfies Prisma.ImportacaoExecucaoInclude;
}

async function findActiveExecutionTx(tx: Prisma.TransactionClient, restaurantId?: string) {
  return tx.importacaoExecucao.findFirst({
    where: {
      ...(restaurantId ? { cd_restaurante: restaurantId } : {}),
      tp_status: {
        in: [importacao_status.pendente, importacao_status.processando]
      }
    },
    orderBy: [{ ts_criacao: "asc" }]
  });
}

async function findExecutionByIdTx(tx: Prisma.TransactionClient, executionId: string) {
  return tx.importacaoExecucao.findUnique({
    where: { cd_importacao: executionId }
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
        sn_resolvido: false,
        ...(input?.executionId ? { cd_importacao_execucao: input.executionId } : {})
      },
      orderBy: [{ ts_criacao: "desc" }, { nr_linha: "asc" }],
      include: {
        staging: true
      }
    });

    return conflicts.map((conflict) => {
      const details = asObject(conflict.js_detalhes);

      return {
        id: conflict.cd_conflito,
        executionId: conflict.cd_importacao_execucao,
        type: conflict.tp_conflito,
        rawName: conflict.ds_nome_bruto ?? "",
        normalizedName: conflict.nm_normalizado ?? "",
        sheetName: conflict.nm_planilha ?? "",
        rowNumber: conflict.nr_linha ?? 0,
        confidence: conflict.vl_confianca?.toFixed(4) ?? "0.0000",
        suggestedItemName: readString(details, "best_candidate"),
        suggestedAlias: readString(details, "raw_name"),
        stagingStatus: conflict.staging?.tp_status ?? "conflict"
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
            where: { cd_usuario: input.actorId },
            select: { cd_usuario: true }
          })
        : null;
      const conflict = await tx.importacaoConflito.findUnique({
        where: { cd_conflito: input.conflictId },
        include: {
          staging: true
        }
      });

      if (!conflict) {
        throw new Error(`Conflito ${input.conflictId} nao encontrado.`);
      }

      const item = await tx.item.findUnique({
        where: { cd_item: input.targetItemId }
      });

      if (!item) {
        throw new Error(`Item ${input.targetItemId} nao encontrado.`);
      }

      const aliasSource = input.alias?.trim() || conflict.ds_nome_bruto || conflict.nm_normalizado || null;
      const conflictName = conflict.nm_normalizado ?? conflict.ds_nome_bruto;
      const conflictsToResolve =
        input.applyToExecutionName && conflict.cd_importacao_execucao && conflictName
          ? await tx.importacaoConflito.findMany({
              where: {
                cd_importacao_execucao: conflict.cd_importacao_execucao,
                sn_resolvido: false,
                OR: conflict.nm_normalizado
                  ? [{ nm_normalizado: conflict.nm_normalizado }]
                  : [{ ds_nome_bruto: conflict.ds_nome_bruto }]
              },
              include: {
                staging: true
              }
            })
          : [conflict];

      if (aliasSource) {
        await tx.itemAlias.upsert({
          where: {
            cd_item_nm_alias_normalizado: {
              cd_item: item.cd_item,
              nm_alias_normalizado: normalizeAliasValue(aliasSource)
            }
          },
          update: {
            nm_alias: aliasSource,
            ds_origem: "reconciliacao_manual_ui"
          },
          create: {
            cd_item: item.cd_item,
            nm_alias: aliasSource,
            nm_alias_normalizado: normalizeAliasValue(aliasSource),
            ds_origem: "reconciliacao_manual_ui"
          }
        });
      }

      const stagingIds = conflictsToResolve
        .map((entry) => entry.cd_staging)
        .filter((value): value is string => Boolean(value));

      if (stagingIds.length > 0) {
        await tx.importacaoStaging.updateMany({
          where: {
            cd_staging: {
              in: stagingIds
            }
          },
          data: {
            cd_item: item.cd_item,
            tp_status: importacao_linha_status.imported
          }
        });
      }

      for (const entry of conflictsToResolve) {
        const currentDetails = asObject(entry.js_detalhes) ?? {};

        await tx.importacaoConflito.update({
          where: { cd_conflito: entry.cd_conflito },
          data: {
            sn_resolvido: true,
            js_detalhes: {
              ...currentDetails,
              resolucaoManual: {
                itemId: item.cd_item,
                itemNome: item.nm_item,
                aliasAplicado: aliasSource,
                aplicadaEmLote: conflictsToResolve.length > 1
              }
            }
          }
        });
      }

      await tx.auditoria.create({
        data: {
          cd_usuario: actorUser?.cd_usuario ?? null,
          nm_entidade: "importacao_conflito",
          cd_entidade: conflict.cd_conflito,
          ds_acao: "import.conflict.reconciled.via_ui",
          js_depois: {
            conflictId: conflict.cd_conflito,
            itemId: item.cd_item,
            itemNome: item.nm_item,
            aliasAplicado: aliasSource,
            resolvedConflictCount: conflictsToResolve.length,
            actorName: input.actorName
          }
        }
      });

      return {
        conflictId: conflict.cd_conflito,
        itemId: item.cd_item,
        itemName: item.nm_item,
        alias: aliasSource,
        resolvedConflictCount: conflictsToResolve.length
      };
    });
  } catch {
    return null;
  }
}

async function listImportExecutionsWithPrisma(
  filters?: ImportExecutionFilters & { restaurantId?: string }
) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const executions = await prisma.importacaoExecucao.findMany({
      where: {
        ...(filters?.restaurantId ? { cd_restaurante: filters.restaurantId } : {}),
        ...(filters?.status ? { tp_status: filters.status } : {}),
        ...(filters?.dateFrom || filters?.dateTo
          ? {
              ts_criacao: {
                ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
                ...(filters.dateTo ? { lte: filters.dateTo } : {})
              }
            }
          : {})
      },
      orderBy: [{ ts_criacao: "desc" }],
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
      where: { cd_importacao: id },
      include: importExecutionInclude()
    });

    return execution ? mapImportExecution(execution) : null;
  } catch {
    return null;
  }
}

async function getActiveImportExecutionWithPrisma(restaurantId?: string) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  try {
    const execution = await prisma.importacaoExecucao.findFirst({
      where: {
        ...(restaurantId ? { cd_restaurante: restaurantId } : {}),
        tp_status: {
          in: [importacao_status.pendente, importacao_status.processando]
        }
      },
      orderBy: [{ ts_criacao: "asc" }],
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
  restaurantId?: string | null;
}) {
  const prisma = resolvePrismaClient();

  if (!prisma) {
    return null;
  }

  return withImportQueueLock(prisma, async (tx) => {
    const activeExecution = await findActiveExecutionTx(tx, input.restaurantId ?? undefined);
    assertCanCreateImportExecution(
      activeExecution
        ? {
            id: activeExecution.cd_importacao,
            status: activeExecution.tp_status,
            origemArquivo: activeExecution.ds_origem_arquivo
          }
        : null
    );
    const requestingUser = input.requestedByUserId
      ? await tx.user.findUnique({
          where: { cd_usuario: input.requestedByUserId },
          select: { cd_usuario: true }
        })
      : null;

    const execution = await tx.importacaoExecucao.create({
      data: {
        ds_origem_arquivo: input.originalFileName,
        ds_caminho_arquivo: input.originalFilePath,
        ds_hash: input.fileHash,
        ds_mime_type: input.mimeType ?? null,
        nr_tamanho_bytes: input.fileSizeBytes ?? null,
        tp_status: importacao_status.pendente,
        ds_estagio_atual: "aguardando_worker",
        js_artefatos: toJsonInput({
          originalFilePath: input.originalFilePath
        }),
        cd_solicitante: requestingUser?.cd_usuario ?? null,
        cd_restaurante: input.restaurantId ?? null
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
      where: { cd_importacao: executionId },
      data: {
        tp_status:
          current.tp_status === importacao_status.pendente
            ? getNextImportExecutionStatus(current.tp_status, "start_processing")
            : current.tp_status,
        ds_estagio_atual: input.stage,
        ts_inicio: current.ts_inicio ?? new Date(),
        js_detalhes_tecnicos: mergePlainObject(current.js_detalhes_tecnicos, input.technicalDetails)
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
      where: { cd_importacao: executionId },
      data: {
        tp_status: getNextImportExecutionStatus(
          current.tp_status,
          hasConflicts ? "complete_with_conflicts" : "complete"
        ),
        ds_estagio_atual: input.stage,
        js_resumo:
          input.operationalSummary === undefined
            ? undefined
            : toNullableJsonInput(input.operationalSummary),
        js_resumo_amigavel: toJsonInput(input.friendlySummary),
        js_detalhes_tecnicos: mergePlainObject(current.js_detalhes_tecnicos, input.technicalDetails),
        js_artefatos: mergePlainObject(current.js_artefatos, input.artifacts),
        ts_fim: new Date()
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
      where: { cd_importacao: executionId },
      data: {
        tp_status: getNextImportExecutionStatus(current.tp_status, "fail"),
        ds_estagio_atual: input.stage,
        js_resumo:
          input.operationalSummary === undefined
            ? undefined
            : toNullableJsonInput(input.operationalSummary),
        js_resumo_amigavel: toJsonInput(input.friendlySummary),
        js_detalhes_tecnicos: mergePlainObject(current.js_detalhes_tecnicos, input.technicalDetails),
        js_artefatos: mergePlainObject(current.js_artefatos, input.artifacts),
        ts_fim: new Date()
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
      status: activeExecution.status as importacao_status,
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

export function getImportRepository(restaurantId = "rest_padrao") {
  return {
    async createImportExecution(input: {
      originalFileName: string;
      originalFilePath: string;
      fileHash: string;
      fileSizeBytes?: number | null;
      mimeType?: string | null;
      requestedByUserId?: string | null;
    }) {
      const prismaResult = await createImportExecutionWithPrisma({ ...input, restaurantId });
      if (prismaResult) {
        return prismaResult;
      }

      return createImportExecutionInDemo(input);
    },

    async listImportExecutions(filters?: ImportExecutionFilters) {
      const prismaResult = await listImportExecutionsWithPrisma({ ...filters, restaurantId });
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
      const prismaResult = await getActiveImportExecutionWithPrisma(restaurantId);
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
          execution.status === importacao_status.pendente
            ? getNextImportExecutionStatus(
                execution.status as importacao_status,
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
          execution.status as importacao_status,
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
        status: getNextImportExecutionStatus(execution.status as importacao_status, "fail"),
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
