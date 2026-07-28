// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import {
  importacao_linha_status,
  importacao_status
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
          nm_normalizado: {
            startsWith: "integracao-importacao-"
          }
        }
      }
    });
    await prisma.importacaoConflito.deleteMany({
      where: {
        OR: [
          {
            nm_normalizado: {
              startsWith: "tomate teste"
            }
          },
          {
            execucao: {
              ds_origem_arquivo: "integracao-importacao.xlsx"
            }
          }
        ]
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          ds_origem_arquivo: "integracao-importacao.xlsx"
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        ds_origem_arquivo: "integracao-importacao.xlsx"
      }
    });
    await prisma.item.deleteMany({
      where: {
        nm_normalizado: {
          startsWith: "integracao-importacao-"
        }
      }
    });

    const item = await prisma.item.create({
      data: {
        nm_item: "Integracao Importacao Tomate",
        nm_normalizado: "integracao-importacao-tomate",
        tp_item: "insumo"
      }
    });

    const execucao = await prisma.importacaoExecucao.create({
      data: {
        ds_origem_arquivo: "integracao-importacao.xlsx",
        tp_status: importacao_status.concluida_com_conflitos,
        // listPendingConflicts agora escopa por restaurante (fix de bug de
        // badge cross-tenant); getImportRepository() usa "rest_padrao" como
        // default quando chamado sem argumento, como faz este teste.
        cd_restaurante: "rest_padrao"
      }
    });

    const staging = await prisma.importacaoStaging.create({
      data: {
        cd_importacao_execucao: execucao.cd_importacao,
        nm_entidade: "item",
        ds_chave_externa: "item:integracao:1",
        nm_planilha: "ABA TESTE",
        nr_linha: 1,
        js_payload: {
          display_name: "Tomate Teste"
        },
        tp_status: importacao_linha_status.conflict
      }
    });

    const conflict = await prisma.importacaoConflito.create({
      data: {
        cd_importacao_execucao: execucao.cd_importacao,
        cd_staging: staging.cd_staging,
        tp_conflito: "name_conflict",
        ds_nome_bruto: "Tomate Teste",
        nm_normalizado: "tomate teste",
        nm_planilha: "ABA TESTE",
        nr_linha: 1,
        vl_confianca: "0.9100",
        js_detalhes: {
          best_candidate: "Integracao Importacao Tomate"
        }
      }
    });

    const repository = getImportRepository();
    const pending = await repository.listPendingConflicts();

    expect(pending.some((entry) => entry.id === conflict.cd_conflito)).toBe(true);

    const resolved = await repository.resolveConflict({
      conflictId: conflict.cd_conflito,
      targetItemId: item.cd_item,
      alias: "Tomate Teste",
      actorId: null,
      actorName: "Teste Integracao"
    });

    expect(resolved?.itemId).toBe(item.cd_item);

    const persistedConflict = await prisma.importacaoConflito.findUniqueOrThrow({
      where: { cd_conflito: conflict.cd_conflito }
    });
    const persistedAlias = await prisma.itemAlias.findFirst({
      where: { cd_item: item.cd_item }
    });
    const persistedStaging = await prisma.importacaoStaging.findUniqueOrThrow({
      where: { cd_staging: staging.cd_staging }
    });

    expect(persistedConflict.sn_resolvido).toBe(true);
    expect(persistedAlias?.nm_alias).toBe("Tomate Teste");
    expect(persistedStaging.tp_status).toBe(importacao_linha_status.imported);
  });

  it("resolves all unresolved conflicts with the same normalized name in one execution", async () => {
    await prisma.itemAlias.deleteMany({
      where: {
        item: {
          nm_normalizado: {
            startsWith: "integracao-importacao-lote-"
          }
        }
      }
    });
    await prisma.importacaoConflito.deleteMany({
      where: {
        OR: [
          {
            nm_normalizado: "integracao-importacao-lote-tomate"
          },
          {
            execucao: {
              ds_origem_arquivo: {
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
          ds_origem_arquivo: {
            startsWith: "integracao-importacao-lote-"
          }
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        ds_origem_arquivo: {
          startsWith: "integracao-importacao-lote-"
        }
      }
    });
    await prisma.item.deleteMany({
      where: {
        nm_normalizado: {
          startsWith: "integracao-importacao-lote-"
        }
      }
    });

    const item = await prisma.item.create({
      data: {
        nm_item: "Integracao Importacao Lote Tomate",
        nm_normalizado: "integracao-importacao-lote-tomate-item",
        tp_item: "insumo"
      }
    });

    const execution = await prisma.importacaoExecucao.create({
      data: {
        ds_origem_arquivo: "integracao-importacao-lote-principal.xlsx",
        tp_status: importacao_status.concluida_com_conflitos
      }
    });
    const otherExecution = await prisma.importacaoExecucao.create({
      data: {
        ds_origem_arquivo: "integracao-importacao-lote-outra.xlsx",
        tp_status: importacao_status.concluida_com_conflitos
      }
    });

    const firstStaging = await prisma.importacaoStaging.create({
      data: {
        cd_importacao_execucao: execution.cd_importacao,
        nm_entidade: "item",
        ds_chave_externa: "item:lote:1",
        nm_planilha: "ABA TESTE",
        nr_linha: 1,
        js_payload: { display_name: "Tomate Lote" },
        tp_status: importacao_linha_status.conflict
      }
    });
    const secondStaging = await prisma.importacaoStaging.create({
      data: {
        cd_importacao_execucao: execution.cd_importacao,
        nm_entidade: "item",
        ds_chave_externa: "item:lote:2",
        nm_planilha: "ABA TESTE",
        nr_linha: 2,
        js_payload: { display_name: "Tomate Lote" },
        tp_status: importacao_linha_status.conflict
      }
    });
    const externalStaging = await prisma.importacaoStaging.create({
      data: {
        cd_importacao_execucao: otherExecution.cd_importacao,
        nm_entidade: "item",
        ds_chave_externa: "item:lote:3",
        nm_planilha: "ABA TESTE",
        nr_linha: 3,
        js_payload: { display_name: "Tomate Lote" },
        tp_status: importacao_linha_status.conflict
      }
    });

    const firstConflict = await prisma.importacaoConflito.create({
      data: {
        cd_importacao_execucao: execution.cd_importacao,
        cd_staging: firstStaging.cd_staging,
        tp_conflito: "unit_mismatch",
        ds_nome_bruto: "Tomate Lote",
        nm_normalizado: "integracao-importacao-lote-tomate",
        nm_planilha: "ABA TESTE",
        nr_linha: 1,
        vl_confianca: "0.9900",
        js_detalhes: { best_candidate: "Integracao Importacao Lote Tomate" }
      }
    });
    const secondConflict = await prisma.importacaoConflito.create({
      data: {
        cd_importacao_execucao: execution.cd_importacao,
        cd_staging: secondStaging.cd_staging,
        tp_conflito: "unit_mismatch",
        ds_nome_bruto: "Tomate Lote",
        nm_normalizado: "integracao-importacao-lote-tomate",
        nm_planilha: "ABA TESTE",
        nr_linha: 2,
        vl_confianca: "0.9900",
        js_detalhes: { best_candidate: "Integracao Importacao Lote Tomate" }
      }
    });
    const externalConflict = await prisma.importacaoConflito.create({
      data: {
        cd_importacao_execucao: otherExecution.cd_importacao,
        cd_staging: externalStaging.cd_staging,
        tp_conflito: "unit_mismatch",
        ds_nome_bruto: "Tomate Lote",
        nm_normalizado: "integracao-importacao-lote-tomate",
        nm_planilha: "ABA TESTE",
        nr_linha: 3,
        vl_confianca: "0.9900",
        js_detalhes: { best_candidate: "Integracao Importacao Lote Tomate" }
      }
    });

    const resolved = await getImportRepository().resolveConflict({
      conflictId: firstConflict.cd_conflito,
      targetItemId: item.cd_item,
      alias: "Tomate Lote",
      applyToExecutionName: true,
      actorId: null,
      actorName: "Teste Integracao"
    });

    expect(resolved?.itemId).toBe(item.cd_item);
    expect(resolved?.resolvedConflictCount).toBe(2);

    const persistedConflicts = await prisma.importacaoConflito.findMany({
      where: {
        cd_conflito: {
          in: [firstConflict.cd_conflito, secondConflict.cd_conflito, externalConflict.cd_conflito]
        }
      },
      orderBy: { nr_linha: "asc" }
    });
    const persistedAlias = await prisma.itemAlias.findMany({
      where: { cd_item: item.cd_item }
    });
    const persistedStages = await prisma.importacaoStaging.findMany({
      where: {
        cd_staging: {
          in: [firstStaging.cd_staging, secondStaging.cd_staging, externalStaging.cd_staging]
        }
      },
      orderBy: { nr_linha: "asc" }
    });

    expect(persistedConflicts[0]?.sn_resolvido).toBe(true);
    expect(persistedConflicts[1]?.sn_resolvido).toBe(true);
    expect(persistedConflicts[2]?.sn_resolvido).toBe(false);
    expect(persistedAlias).toHaveLength(1);
    expect(persistedAlias[0]?.nm_alias).toBe("Tomate Lote");
    expect(persistedStages[0]?.tp_status).toBe(importacao_linha_status.imported);
    expect(persistedStages[1]?.tp_status).toBe(importacao_linha_status.imported);
    expect(persistedStages[2]?.tp_status).toBe(importacao_linha_status.conflict);
  });

  it("creates, serializes and completes import executions", async () => {
    await prisma.importacaoConflito.deleteMany({
      where: {
        execucao: {
          ds_origem_arquivo: {
            startsWith: "integracao-load-legado"
          }
        }
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          ds_origem_arquivo: {
            startsWith: "integracao-load-legado"
          }
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        ds_origem_arquivo: {
          startsWith: "integracao-load-legado"
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        ds_origem_arquivo: {
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

    expect(created.status).toBe(importacao_status.pendente);
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

    expect(processing.status).toBe(importacao_status.processando);
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

    expect(processingStageUpdate.status).toBe(importacao_status.processando);
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

    expect(completed.status).toBe(importacao_status.concluida);
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
          ds_origem_arquivo: "integracao-execucao-removida.xlsx"
        }
      }
    });
    await prisma.importacaoStaging.deleteMany({
      where: {
        execucao: {
          ds_origem_arquivo: "integracao-execucao-removida.xlsx"
        }
      }
    });
    await prisma.importacaoExecucao.deleteMany({
      where: {
        ds_origem_arquivo: "integracao-execucao-removida.xlsx"
      }
    });

    const execution = await prisma.importacaoExecucao.create({
      data: {
        ds_origem_arquivo: "integracao-execucao-removida.xlsx",
        tp_status: importacao_status.processando,
        ds_estagio_atual: "carregando_banco",
        ts_inicio: new Date()
      }
    });

    await prisma.importacaoExecucao.delete({
      where: { cd_importacao: execution.cd_importacao }
    });

    const result = await getImportRepository().markImportExecutionFailed(execution.cd_importacao, {
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
