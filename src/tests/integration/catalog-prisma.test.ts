// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { item_type, unidade_tipo } from "@/generated/prisma/client";
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
        nm_normalizado: {
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
      where: { ds_codigo: "kg-int" },
      update: { nm_unidade: "Quilograma Integracao", tp_unidade: unidade_tipo.massa },
      create: {
        ds_codigo: "kg-int",
        nm_unidade: "Quilograma Integracao",
        tp_unidade: unidade_tipo.massa
      }
    });

    const unidadeG = await prisma.unidadeMedida.upsert({
      where: { ds_codigo: "g-int" },
      update: { nm_unidade: "Grama Integracao", tp_unidade: unidade_tipo.massa },
      create: {
        ds_codigo: "g-int",
        nm_unidade: "Grama Integracao",
        tp_unidade: unidade_tipo.massa
      }
    });

    const fornecedor = await prisma.fornecedor.upsert({
      where: { nm_fornecedor: "Fornecedor Integracao Catalogo" },
      update: {},
      create: { nm_fornecedor: "Fornecedor Integracao Catalogo" }
    });

    const item = await prisma.item.create({
      data: {
        nm_item: "Integracao Catalogo Farinha",
        nm_normalizado: "integracao-catalogo-farinha",
        tp_item: item_type.insumo,
        cd_unidade_estoque: unidadeKg.cd_unidade_medida,
        cd_unidade_uso_padrao: unidadeG.cd_unidade_medida
      }
    });

    await prisma.conversaoUnidade.create({
      data: {
        cd_item: item.cd_item,
        cd_unidade_origem: unidadeKg.cd_unidade_medida,
        cd_unidade_destino: unidadeG.cd_unidade_medida,
        vl_fator: "1000.000000",
        ds_origem: "teste_integracao"
      }
    });

    await prisma.itemCompra.create({
      data: {
        cd_item: item.cd_item,
        cd_fornecedor: fornecedor.cd_fornecedor,
        cd_unidade_compra: unidadeKg.cd_unidade_medida,
        vl_qtd_embalagem: "1.0000",
        vl_custo_compra: "19.9000",
        vl_custo_unitario_base: "19.900000"
      }
    });

    const persisted = await prisma.item.findUniqueOrThrow({
      where: { cd_item: item.cd_item },
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
    expect(persisted.compras[0]?.fornecedor.nm_fornecedor).toBe("Fornecedor Integracao Catalogo");
    expect(persisted.compras[0]?.vl_custo_compra.toString()).toBe("19.9");
  });
});
