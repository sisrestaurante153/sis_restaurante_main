// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import {
  ficha_status,
  item_type,
  modo_rendimento,
  tipo_componente,
  unidade_tipo
} from "@/generated/prisma/client";
import {
  recalculateCascade,
  recalculateItemInTransaction,
  rebuildDependencyClosure
} from "@/modules/engineering/server/cost-engine-service";
import {
  closeIntegrationPrisma,
  getIntegrationPrisma,
  isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("engineering prisma integration", () => {
  const prisma = getIntegrationPrisma();

  afterAll(async () => {
    await closeIntegrationPrisma();
  });

  it("rebuilds dependency closure and calculates an active ficha", async () => {
    await prisma.calculoComponenteSnapshot.deleteMany();
    await prisma.custoSnapshotItem.deleteMany({
      where: {
        item: {
          nm_normalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.calculoExecucao.deleteMany({
      where: {
        item: {
          nm_normalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.dependenciaItem.deleteMany({
      where: {
        OR: [
          {
            itemAscendente: {
              nm_normalizado: {
                startsWith: "integracao-engenharia-"
              }
            }
          },
          {
            itemDescendente: {
              nm_normalizado: {
                startsWith: "integracao-engenharia-"
              }
            }
          }
        ]
      }
    });
    await prisma.fichaComponente.deleteMany({
      where: {
        fichaTecnica: {
          itemResultante: {
            nm_normalizado: {
              startsWith: "integracao-engenharia-"
            }
          }
        }
      }
    });
    await prisma.fichaTecnica.deleteMany({
      where: {
        itemResultante: {
          nm_normalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.itemCompra.deleteMany({
      where: {
        item: {
          nm_normalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.item.deleteMany({
      where: {
        nm_normalizado: {
          startsWith: "integracao-engenharia-"
        }
      }
    });

    const unidadeKg = await prisma.unidadeMedida.upsert({
      where: { ds_codigo: "kg-eng-int" },
      update: { nm_unidade: "Quilograma Engenharia Integracao", tp_unidade: unidade_tipo.massa },
      create: {
        ds_codigo: "kg-eng-int",
        nm_unidade: "Quilograma Engenharia Integracao",
        tp_unidade: unidade_tipo.massa
      }
    });

    const unidadeUn = await prisma.unidadeMedida.upsert({
      where: { ds_codigo: "un-eng-int" },
      update: { nm_unidade: "Unidade Engenharia Integracao", tp_unidade: unidade_tipo.contagem },
      create: {
        ds_codigo: "un-eng-int",
        nm_unidade: "Unidade Engenharia Integracao",
        tp_unidade: unidade_tipo.contagem
      }
    });

    const unidadeG = await prisma.unidadeMedida.upsert({
      where: { ds_codigo: "g" },
      update: { nm_unidade: "Grama", tp_unidade: unidade_tipo.massa },
      create: {
        ds_codigo: "g",
        nm_unidade: "Grama",
        tp_unidade: unidade_tipo.massa
      }
    });

    const fornecedor = await prisma.fornecedor.upsert({
      where: { nm_fornecedor: "Fornecedor Integracao Engenharia" },
      update: {},
      create: { nm_fornecedor: "Fornecedor Integracao Engenharia" }
    });

    const insumo = await prisma.item.create({
      data: {
        nm_item: "Integracao Engenharia Tomate",
        nm_normalizado: "integracao-engenharia-tomate",
        tp_item: item_type.insumo,
        cd_unidade_estoque: unidadeKg.cd_unidade_medida,
        cd_unidade_uso_padrao: unidadeKg.cd_unidade_medida
      }
    });

    await prisma.itemCompra.create({
      data: {
        cd_item: insumo.cd_item,
        cd_fornecedor: fornecedor.cd_fornecedor,
        cd_unidade_compra: unidadeKg.cd_unidade_medida,
        vl_qtd_embalagem: "1.0000",
        vl_custo_compra: "12.0000",
        vl_custo_unitario_base: "12.000000"
      }
    });

    const embalagem = await prisma.item.create({
      data: {
        nm_item: "Integracao Engenharia Pote",
        nm_normalizado: "integracao-engenharia-pote",
        tp_item: item_type.embalagem,
        cd_unidade_estoque: unidadeUn.cd_unidade_medida,
        cd_unidade_uso_padrao: unidadeUn.cd_unidade_medida
      }
    });

    await prisma.itemCompra.create({
      data: {
        cd_item: embalagem.cd_item,
        cd_fornecedor: fornecedor.cd_fornecedor,
        cd_unidade_compra: unidadeUn.cd_unidade_medida,
        vl_qtd_embalagem: "1.0000",
        vl_custo_compra: "0.9000",
        vl_custo_unitario_base: "0.900000"
      }
    });

    const produto = await prisma.item.create({
      data: {
        nm_item: "Integracao Engenharia Produto",
        nm_normalizado: "integracao-engenharia-produto",
        tp_item: item_type.produto_pronto,
        cd_unidade_estoque: unidadeKg.cd_unidade_medida,
        cd_unidade_uso_padrao: unidadeKg.cd_unidade_medida
      }
    });

    const ficha = await prisma.fichaTecnica.create({
      data: {
        cd_item_resultante: produto.cd_item,
        nr_versao: 1,
        tp_status: ficha_status.ativa,
        tp_modo_rendimento: modo_rendimento.peso_final,
        vl_peso_final: "1.0000"
      }
    });

    await prisma.fichaComponente.createMany({
      data: [
        {
          cd_ficha_tecnica: ficha.cd_ficha_tecnica,
          cd_item_componente: insumo.cd_item,
          tp_componente: tipo_componente.ingrediente,
          nr_ordem: 1,
          vl_qtd_bruta: "1000.0000",
          vl_qtd_limpa: "1000.0000",
          cd_unidade_uso: unidadeG.cd_unidade_medida,
          vl_fator_correcao: "1.000000"
        },
        {
          cd_ficha_tecnica: ficha.cd_ficha_tecnica,
          cd_item_componente: embalagem.cd_item,
          tp_componente: tipo_componente.embalagem,
          nr_ordem: 2,
          vl_qtd_bruta: "1.0000",
          vl_qtd_limpa: "1.0000",
          cd_unidade_uso: unidadeUn.cd_unidade_medida
        }
      ]
    });

    await prisma.$transaction(async (tx) => {
      await rebuildDependencyClosure(tx);
      const { result } = await recalculateItemInTransaction(tx, produto.cd_item, "teste_integracao");
      expect(result.totalCost.toString()).toBe("12.9");
    });

    await prisma.itemCompra.deleteMany({
      where: { cd_item: insumo.cd_item }
    });

    await prisma.itemCompra.create({
      data: {
        cd_item: insumo.cd_item,
        cd_fornecedor: fornecedor.cd_fornecedor,
        cd_unidade_compra: unidadeKg.cd_unidade_medida,
        vl_qtd_embalagem: "1.0000",
        vl_custo_compra: "14.0000",
        vl_custo_unitario_base: "14.000000"
      }
    });

    await recalculateCascade(prisma, [insumo.cd_item], "teste_integracao_preco");

    const latestProductSnapshot = await prisma.custoSnapshotItem.findFirst({
      where: { cd_item: produto.cd_item },
      orderBy: { ts_calculo: "desc" }
    });

    expect(latestProductSnapshot?.vl_custo_total.toString()).toBe("14.9");

    const closure = await prisma.dependenciaItem.findMany({
      where: {
        cd_item_ascendente: produto.cd_item
      }
    });

    expect(
      closure.some((row) => row.cd_item_descendente === insumo.cd_item && row.nr_profundidade === 1)
    ).toBe(true);
  });
});
