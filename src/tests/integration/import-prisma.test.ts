// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import {
  ImportacaoLinhaStatus,
  ImportacaoStatus
} from "@/generated/prisma/client";
import { getImportRepository } from "@/modules/import/server/import-repository";
import { ActiveImportExecutionError } from "@/modules/import/domain/import-execution";
import {
  closeIntegrationPrisma,
  getIntegrationPrisma,
  isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("import prisma integration", () => {
  const prisma = getIntegrationPrisma();

  afterAll(async () => {
    await closeIntegrationPrisma();
  });

  it("lists and resolves persisted import conflicts", async () => {
    await prisma.itemAlias.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            startsWith: "integracao-importacao-"
          }
        }
      }
    });
    await prisma.importacaoConflito.deleteMany({
      where: {
        OR: [
          {
            normalizedName: {
              startsWith: "tomate teste"
            }
          },
          {
            execucao: {
              origemArquivo: "integracao-importacao.xlsx"
            }
          }
        ]
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          origemArquivo: "integracao-importacao.xlsx"
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: "integracao-importacao.xlsx"
      }
    });
    await prisma.item.deleteMany({
      where: {
        nomeNormalizado: {
          startsWith: "integracao-importacao-"
        }
      }
    });

    const item = await prisma.item.create({
      data: {
        nome: "Integracao Importacao Tomate",
        nomeNormalizado: "integracao-importacao-tomate",
        tipoPrincipal: "insumo"
      }
    });

    const execucao = await prisma.importacaoExecucao.create({
      data: {
        origemArquivo: "integracao-importacao.xlsx",
        status: ImportacaoStatus.concluida_com_conflitos
      }
    });

    const staging = await prisma.importacaoStaging.create({
      data: {
        execucaoId: execucao.id,
        entidade: "item",
        chaveExterna: "item:integracao:1",
        sheetName: "ABA TESTE",
        rowNumber: 1,
        payloadJson: {
          display_name: "Tomate Teste"
        },
        status: ImportacaoLinhaStatus.conflict
      }
    });

    const conflict = await prisma.importacaoConflito.create({
      data: {
        execucaoId: execucao.id,
        stagingId: staging.id,
        tipo: "name_conflict",
        rawName: "Tomate Teste",
        normalizedName: "tomate teste",
        sheetName: "ABA TESTE",
        rowNumber: 1,
        confidence: "0.9100",
        detalhesJson: {
          best_candidate: "Integracao Importacao Tomate"
        }
      }
    });

    const repository = getImportRepository();
    const pending = await repository.listPendingConflicts();

    expect(pending.some((entry) => entry.id === conflict.id)).toBe(true);

    const resolved = await repository.resolveConflict({
      conflictId: conflict.id,
      targetItemId: item.id,
      alias: "Tomate Teste",
      actorId: null,
      actorName: "Teste Integracao"
    });

    expect(resolved?.itemId).toBe(item.id);

    const persistedConflict = await prisma.importacaoConflito.findUniqueOrThrow({
      where: { id: conflict.id }
    });
    const persistedAlias = await prisma.itemAlias.findFirst({
      where: { itemId: item.id }
    });
    const persistedStaging = await prisma.importacaoStaging.findUniqueOrThrow({
      where: { id: staging.id }
    });

    expect(persistedConflict.resolvido).toBe(true);
    expect(persistedAlias?.alias).toBe("Tomate Teste");
    expect(persistedStaging.status).toBe(ImportacaoLinhaStatus.imported);
  });

  it("resolves all unresolved conflicts with the same normalized name in one execution", async () => {
    await prisma.itemAlias.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            startsWith: "integracao-importacao-lote-"
          }
        }
      }
    });
    await prisma.importacaoConflito.deleteMany({
      where: {
        OR: [
          {
            normalizedName: "integracao-importacao-lote-tomate"
          },
          {
            execucao: {
              origemArquivo: {
                startsWith: "integracao-importacao-lote-"
              }
            }
          }
        ]
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          origemArquivo: {
            startsWith: "integracao-importacao-lote-"
          }
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: {
          startsWith: "integracao-importacao-lote-"
        }
      }
    });
    await prisma.item.deleteMany({
      where: {
        nomeNormalizado: {
          startsWith: "integracao-importacao-lote-"
        }
      }
    });

    const item = await prisma.item.create({
      data: {
        nome: "Integracao Importacao Lote Tomate",
        nomeNormalizado: "integracao-importacao-lote-tomate-item",
        tipoPrincipal: "insumo"
      }
    });

    const execution = await prisma.importacaoExecucao.create({
      data: {
        origemArquivo: "integracao-importacao-lote-principal.xlsx",
        status: ImportacaoStatus.concluida_com_conflitos
      }
    });
    const otherExecution = await prisma.importacaoExecucao.create({
      data: {
        origemArquivo: "integracao-importacao-lote-outra.xlsx",
        status: ImportacaoStatus.concluida_com_conflitos
      }
    });

    const firstStaging = await prisma.importacaoStaging.create({
      data: {
        execucaoId: execution.id,
        entidade: "item",
        chaveExterna: "item:lote:1",
        sheetName: "ABA TESTE",
        rowNumber: 1,
        payloadJson: {
          display_name: "Tomate Lote"
        },
        status: ImportacaoLinhaStatus.conflict
      }
    });
    const secondStaging = await prisma.importacaoStaging.create({
      data: {
        execucaoId: execution.id,
        entidade: "item",
        chaveExterna: "item:lote:2",
        sheetName: "ABA TESTE",
        rowNumber: 2,
        payloadJson: {
          display_name: "Tomate Lote"
        },
        status: ImportacaoLinhaStatus.conflict
      }
    });
    const externalStaging = await prisma.importacaoStaging.create({
      data: {
        execucaoId: otherExecution.id,
        entidade: "item",
        chaveExterna: "item:lote:3",
        sheetName: "ABA TESTE",
        rowNumber: 3,
        payloadJson: {
          display_name: "Tomate Lote"
        },
        status: ImportacaoLinhaStatus.conflict
      }
    });

    const firstConflict = await prisma.importacaoConflito.create({
      data: {
        execucaoId: execution.id,
        stagingId: firstStaging.id,
        tipo: "unit_mismatch",
        rawName: "Tomate Lote",
        normalizedName: "integracao-importacao-lote-tomate",
        sheetName: "ABA TESTE",
        rowNumber: 1,
        confidence: "0.9900",
        detalhesJson: {
          best_candidate: "Integracao Importacao Lote Tomate"
        }
      }
    });
    const secondConflict = await prisma.importacaoConflito.create({
      data: {
        execucaoId: execution.id,
        stagingId: secondStaging.id,
        tipo: "unit_mismatch",
        rawName: "Tomate Lote",
        normalizedName: "integracao-importacao-lote-tomate",
        sheetName: "ABA TESTE",
        rowNumber: 2,
        confidence: "0.9900",
        detalhesJson: {
          best_candidate: "Integracao Importacao Lote Tomate"
        }
      }
    });
    const externalConflict = await prisma.importacaoConflito.create({
      data: {
        execucaoId: otherExecution.id,
        stagingId: externalStaging.id,
        tipo: "unit_mismatch",
        rawName: "Tomate Lote",
        normalizedName: "integracao-importacao-lote-tomate",
        sheetName: "ABA TESTE",
        rowNumber: 3,
        confidence: "0.9900",
        detalhesJson: {
          best_candidate: "Integracao Importacao Lote Tomate"
        }
      }
    });

    const resolved = await getImportRepository().resolveConflict({
      conflictId: firstConflict.id,
      targetItemId: item.id,
      alias: "Tomate Lote",
      applyToExecutionName: true,
      actorId: null,
      actorName: "Teste Integracao"
    });

    expect(resolved?.itemId).toBe(item.id);
    expect(resolved?.resolvedConflictCount).toBe(2);

    const persistedConflicts = await prisma.importacaoConflito.findMany({
      where: {
        id: {
          in: [firstConflict.id, secondConflict.id, externalConflict.id]
        }
      },
      orderBy: {
        rowNumber: "asc"
      }
    });
    const persistedAlias = await prisma.itemAlias.findMany({
      where: { itemId: item.id }
    });
    const persistedStages = await prisma.importacaoStaging.findMany({
      where: {
        id: {
          in: [firstStaging.id, secondStaging.id, externalStaging.id]
        }
      },
      orderBy: {
        rowNumber: "asc"
      }
    });

    expect(persistedConflicts[0]?.resolvido).toBe(true);
    expect(persistedConflicts[1]?.resolvido).toBe(true);
    expect(persistedConflicts[2]?.resolvido).toBe(false);
    expect(persistedAlias).toHaveLength(1);
    expect(persistedAlias[0]?.alias).toBe("Tomate Lote");
    expect(persistedStages[0]?.status).toBe(ImportacaoLinhaStatus.imported);
    expect(persistedStages[1]?.status).toBe(ImportacaoLinhaStatus.imported);
    expect(persistedStages[2]?.status).toBe(ImportacaoLinhaStatus.conflict);
  });

  it("creates, serializes and completes import executions", async () => {
    await prisma.importacaoConflito.deleteMany({
      where: {
        execucao: {
          origemArquivo: {
            startsWith: "integracao-load-legado"
          }
        }
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          origemArquivo: {
            startsWith: "integracao-load-legado"
          }
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: {
          startsWith: "integracao-load-legado"
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: {
          startsWith: "integracao-execucao-"
        }
      }
    });

    const repository = getImportRepository();
    const created = await repository.createImportExecution({
      originalFileName: "integracao-execucao-principal.xlsx",
      originalFilePath: "/tmp/imports/integracao-execucao-principal.xlsx",
      fileHash: "hash-principal",
      fileSizeBytes: 1024,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      requestedByUserId: null
    });

    expect(created.status).toBe(ImportacaoStatus.pendente);
    expect(created.currentStage).toBe("aguardando_worker");

    await expect(
      repository.createImportExecution({
        originalFileName: "integracao-execucao-bloqueada.xlsx",
        originalFilePath: "/tmp/imports/integracao-execucao-bloqueada.xlsx",
        fileHash: "hash-bloqueada",
        fileSizeBytes: 2048,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        requestedByUserId: null
      })
    ).rejects.toBeInstanceOf(ActiveImportExecutionError);

    const processing = await repository.markImportExecutionProcessing(created.id, {
      stage: "parser_python"
    });
    expect(processing).not.toBeNull();
    if (!processing) {
      throw new Error("Expected processing execution to be returned.");
    }

    expect(processing.status).toBe(ImportacaoStatus.processando);
    expect(processing.currentStage).toBe("parser_python");
    expect(processing.startedAt).toBeTruthy();

    const processingStageUpdate = await repository.markImportExecutionProcessing(created.id, {
      stage: "carregando_banco",
      technicalDetails: {
        parserStdout: "ok"
      }
    });
    expect(processingStageUpdate).not.toBeNull();
    if (!processingStageUpdate) {
      throw new Error("Expected processing stage update to be returned.");
    }

    expect(processingStageUpdate.status).toBe(ImportacaoStatus.processando);
    expect(processingStageUpdate.currentStage).toBe("carregando_banco");
    expect(processingStageUpdate.startedAt).toBeTruthy();
    expect(processingStageUpdate.technicalDetails?.parserStdout).toBe("ok");

    const completed = await repository.markImportExecutionCompleted(created.id, {
      stage: "consolidando_resultado",
      friendlySummary: {
        headline: "Importacao concluida",
        whatHappened: "Tudo certo",
        impact: "Base atualizada",
        whatToDoNow: "Seguir operacao"
      },
      technicalDetails: {
        reportPath: "/tmp/imports/report.json"
      },
      artifacts: {
        reportPath: "/tmp/imports/report.json",
        originalFilePath: "/tmp/imports/integracao-execucao-principal.xlsx"
      },
      conflictCount: 0
    });
    expect(completed).not.toBeNull();
    if (!completed) {
      throw new Error("Expected completed execution to be returned.");
    }

    expect(completed.status).toBe(ImportacaoStatus.concluida);
    expect(completed.finishedAt).toBeTruthy();
    expect(completed.friendlySummary?.headline).toBe("Importacao concluida");

    const active = await repository.getActiveImportExecution();
    expect(active).toBeNull();

    const history = await repository.listImportExecutions();
    expect(history.some((execution) => execution.id === created.id)).toBe(true);

    const persisted = await repository.getImportExecution(created.id);
    expect(persisted?.artifacts?.reportPath).toBe("/tmp/imports/report.json");
  });

  it("does not throw when a pending execution is removed before failure bookkeeping", async () => {
    await prisma.importacaoConflito.deleteMany({
      where: {
        execucao: {
          origemArquivo: "integracao-execucao-removida.xlsx"
        }
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          origemArquivo: "integracao-execucao-removida.xlsx"
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        origemArquivo: "integracao-execucao-removida.xlsx"
      }
    });

    const execution = await prisma.importacaoExecucao.create({
      data: {
        origemArquivo: "integracao-execucao-removida.xlsx",
        status: ImportacaoStatus.processando,
        estagioAtual: "carregando_banco",
        iniciadoEm: new Date()
      }
    });

    await prisma.importacaoExecucao.delete({
      where: {
        id: execution.id
      }
    });

    const result = await getImportRepository().markImportExecutionFailed(execution.id, {
      stage: "falha",
      friendlySummary: {
        headline: "Falha controlada",
        whatHappened: "A execucao sumiu antes do fechamento.",
        impact: "Nenhuma atualizacao adicional foi aplicada.",
        whatToDoNow: "Registrar a ocorrencia e seguir o processamento."
      }
    });

    expect(result).toBeNull();
  });
});
