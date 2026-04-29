// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemType, UnidadeTipo } from "@/generated/prisma/client";
import {
  closeIntegrationPrisma,
  getIntegrationPrisma,
  isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("catalog prisma integration", () => {
  const prisma = getIntegrationPrisma();

  beforeAll(async () => {
    await prisma.custoSnapshotItem.deleteMany();
    await prisma.itemCompra.deleteMany();
    await prisma.itemAlias.deleteMany();
    await prisma.conversaoUnidade.deleteMany();
    await prisma.fichaComponente.deleteMany();
    await prisma.fichaTecnica.deleteMany();
    await prisma.item.deleteMany({
      where: {
        nomeNormalizado: {
          startsWith: "integracao-catalogo"
        }
      }
    });
  });

  afterAll(async () => {
    await closeIntegrationPrisma();
  });

  it("persists item, unit conversion and purchase relation", async () => {
    const unidadeKg = await prisma.unidadeMedida.upsert({
      where: { codigo: "kg-int" },
      update: { nome: "Quilograma Integracao", tipo: UnidadeTipo.massa },
      create: {
        codigo: "kg-int",
        nome: "Quilograma Integracao",
        tipo: UnidadeTipo.massa
      }
    });

    const unidadeG = await prisma.unidadeMedida.upsert({
      where: { codigo: "g-int" },
      update: { nome: "Grama Integracao", tipo: UnidadeTipo.massa },
      create: {
        codigo: "g-int",
        nome: "Grama Integracao",
        tipo: UnidadeTipo.massa
      }
    });

    const fornecedor = await prisma.fornecedor.upsert({
      where: { nome: "Fornecedor Integracao Catalogo" },
      update: {},
      create: { nome: "Fornecedor Integracao Catalogo" }
    });

    const item = await prisma.item.create({
      data: {
        nome: "Integracao Catalogo Farinha",
        nomeNormalizado: "integracao-catalogo-farinha",
        tipoPrincipal: ItemType.insumo,
        unidadeEstoqueId: unidadeKg.id,
        unidadeUsoPadraoId: unidadeG.id
      }
    });

    await prisma.conversaoUnidade.create({
      data: {
        itemId: item.id,
        unidadeOrigemId: unidadeKg.id,
        unidadeDestinoId: unidadeG.id,
        fator: "1000.000000",
        origem: "teste_integracao"
      }
    });

    await prisma.itemCompra.create({
      data: {
        itemId: item.id,
        fornecedorId: fornecedor.id,
        unidadeCompraId: unidadeKg.id,
        quantidadePorEmbalagem: "1.0000",
        custoCompra: "19.9000",
        custoUnitarioBase: "19.900000"
      }
    });

    const persisted = await prisma.item.findUniqueOrThrow({
      where: { id: item.id },
      include: {
        conversoes: true,
        compras: {
          include: {
            fornecedor: true
          }
        }
      }
    });

    expect(persisted.conversoes).toHaveLength(1);
    expect(persisted.compras[0]?.fornecedor.nome).toBe("Fornecedor Integracao Catalogo");
    expect(persisted.compras[0]?.custoCompra.toString()).toBe("19.9");
  });
});
