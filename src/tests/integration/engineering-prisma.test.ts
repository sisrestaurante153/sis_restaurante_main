// @ts-nocheck
// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import {
  FichaStatus,
  ItemType,
  ModoRendimento,
  TipoComponente,
  UnidadeTipo
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
          nomeNormalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.calculoExecucao.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
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
              nomeNormalizado: {
                startsWith: "integracao-engenharia-"
              }
            }
          },
          {
            itemDescendente: {
              nomeNormalizado: {
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
            nomeNormalizado: {
              startsWith: "integracao-engenharia-"
            }
          }
        }
      }
    });
    await prisma.fichaTecnica.deleteMany({
      where: {
        itemResultante: {
          nomeNormalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.itemCompra.deleteMany({
      where: {
        item: {
          nomeNormalizado: {
            startsWith: "integracao-engenharia-"
          }
        }
      }
    });
    await prisma.item.deleteMany({
      where: {
        nomeNormalizado: {
          startsWith: "integracao-engenharia-"
        }
      }
    });

    const unidadeKg = await prisma.unidadeMedida.upsert({
      where: { codigo: "kg-eng-int" },
      update: { nome: "Quilograma Engenharia Integracao", tipo: UnidadeTipo.massa },
      create: {
        codigo: "kg-eng-int",
        nome: "Quilograma Engenharia Integracao",
        tipo: UnidadeTipo.massa
      }
    });

    const unidadeUn = await prisma.unidadeMedida.upsert({
      where: { codigo: "un-eng-int" },
      update: { nome: "Unidade Engenharia Integracao", tipo: UnidadeTipo.contagem },
      create: {
        codigo: "un-eng-int",
        nome: "Unidade Engenharia Integracao",
        tipo: UnidadeTipo.contagem
      }
    });

    const unidadeG = await prisma.unidadeMedida.upsert({
      where: { codigo: "g" },
      update: { nome: "Grama", tipo: UnidadeTipo.massa },
      create: {
        codigo: "g",
        nome: "Grama",
        tipo: UnidadeTipo.massa
      }
    });

    const fornecedor = await prisma.fornecedor.upsert({
      where: { nome: "Fornecedor Integracao Engenharia" },
      update: {},
      create: { nome: "Fornecedor Integracao Engenharia" }
    });

    const insumo = await prisma.item.create({
      data: {
        nome: "Integracao Engenharia Tomate",
        nomeNormalizado: "integracao-engenharia-tomate",
        tipoPrincipal: ItemType.insumo,
        unidadeEstoqueId: unidadeKg.id,
        unidadeUsoPadraoId: unidadeKg.id
      }
    });

    await prisma.itemCompra.create({
      data: {
        itemId: insumo.id,
        fornecedorId: fornecedor.id,
        unidadeCompraId: unidadeKg.id,
        quantidadePorEmbalagem: "1.0000",
        custoCompra: "12.0000",
        custoUnitarioBase: "12.000000"
      }
    });

    const embalagem = await prisma.item.create({
      data: {
        nome: "Integracao Engenharia Pote",
        nomeNormalizado: "integracao-engenharia-pote",
        tipoPrincipal: ItemType.embalagem,
        unidadeEstoqueId: unidadeUn.id,
        unidadeUsoPadraoId: unidadeUn.id
      }
    });

    await prisma.itemCompra.create({
      data: {
        itemId: embalagem.id,
        fornecedorId: fornecedor.id,
        unidadeCompraId: unidadeUn.id,
        quantidadePorEmbalagem: "1.0000",
        custoCompra: "0.9000",
        custoUnitarioBase: "0.900000"
      }
    });

    const produto = await prisma.item.create({
      data: {
        nome: "Integracao Engenharia Produto",
        nomeNormalizado: "integracao-engenharia-produto",
        tipoPrincipal: ItemType.produto_pronto,
        unidadeEstoqueId: unidadeKg.id,
        unidadeUsoPadraoId: unidadeKg.id
      }
    });

    const ficha = await prisma.fichaTecnica.create({
      data: {
        itemResultanteId: produto.id,
        versao: 1,
        status: FichaStatus.ativa,
        modoRendimento: ModoRendimento.peso_final,
        pesoFinalInformado: "1.0000"
      }
    });

    await prisma.fichaComponente.createMany({
      data: [
        {
          fichaTecnicaId: ficha.id,
          itemComponenteId: insumo.id,
          tipoComponente: TipoComponente.ingrediente,
          ordem: 1,
          quantidadeBruta: "1000.0000",
          quantidadeLimpa: "1000.0000",
          unidadeUsoId: unidadeG.id,
          fatorCorrecao: "1.000000"
        },
        {
          fichaTecnicaId: ficha.id,
          itemComponenteId: embalagem.id,
          tipoComponente: TipoComponente.embalagem,
          ordem: 2,
          quantidadeBruta: "1.0000",
          quantidadeLimpa: "1.0000",
          unidadeUsoId: unidadeUn.id
        }
      ]
    });

    await prisma.$transaction(async (tx) => {
      await rebuildDependencyClosure(tx);
      const { result } = await recalculateItemInTransaction(tx, produto.id, "teste_integracao");
      expect(result.totalCost.toString()).toBe("12.9");
    });

    await prisma.itemCompra.deleteMany({
      where: { itemId: insumo.id }
    });

    await prisma.itemCompra.create({
      data: {
        itemId: insumo.id,
        fornecedorId: fornecedor.id,
        unidadeCompraId: unidadeKg.id,
        quantidadePorEmbalagem: "1.0000",
        custoCompra: "14.0000",
        custoUnitarioBase: "14.000000"
      }
    });

    await recalculateCascade(prisma, [insumo.id], "teste_integracao_preco");

    const latestProductSnapshot = await prisma.custoSnapshotItem.findFirst({
      where: { itemId: produto.id },
      orderBy: { calculadoEm: "desc" }
    });

    expect(latestProductSnapshot?.custoTotalAtual.toString()).toBe("14.9");

    const closure = await prisma.dependenciaItem.findMany({
      where: {
        itemAscendenteId: produto.id
      }
    });

    expect(closure.some((row) => row.itemDescendenteId === insumo.id && row.profundidade === 1)).toBe(
      true
    );
  });
});
