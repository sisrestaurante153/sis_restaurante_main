// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { item_type, unidade_tipo } from "@/generated/prisma/client";
import {
  closeIntegrationPrisma,
  getIntegrationPrisma,
  isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";

const runIntegration = await isIntegrationDatabaseAvailable();

const KG = "kg-presenter-int";
const G = "g-presenter-int";

describe.skipIf(!runIntegration)(
  "catalog presenter derivation (D-05, D-07)",
  () => {
    const prisma = getIntegrationPrisma();
    const repo = getCatalogRepository();

    let supplierPrimaryId = "";
    let supplierSecondaryId = "";
    let unidadeKgId = "";
    let unidadeGId = "";

    beforeAll(async () => {
      await prisma.itemCompra.deleteMany();
      await prisma.conversaoUnidade.deleteMany();
      await prisma.item.deleteMany({
        where: { nm_normalizado: { startsWith: "integracao-presenter" } }
      });

      const kg = await prisma.unidadeMedida.upsert({
        where: { ds_codigo: KG },
        update: {},
        create: { ds_codigo: KG, nm_unidade: "Kg presenter", tp_unidade: unidade_tipo.massa }
      });
      const g = await prisma.unidadeMedida.upsert({
        where: { ds_codigo: G },
        update: {},
        create: { ds_codigo: G, nm_unidade: "G presenter", tp_unidade: unidade_tipo.massa }
      });
      unidadeKgId = kg.cd_unidade_medida;
      unidadeGId = g.cd_unidade_medida;

      const supA = await prisma.fornecedor.upsert({
        where: { nm_fornecedor: "Presenter Fornecedor Primary" },
        update: {},
        create: { nm_fornecedor: "Presenter Fornecedor Primary" }
      });
      const supB = await prisma.fornecedor.upsert({
        where: { nm_fornecedor: "Presenter Fornecedor Secondary" },
        update: {},
        create: { nm_fornecedor: "Presenter Fornecedor Secondary" }
      });
      supplierPrimaryId = supA.cd_fornecedor;
      supplierSecondaryId = supB.cd_fornecedor;
    });

    afterAll(async () => {
      await closeIntegrationPrisma();
    });

    it("seed direto com 1 principal (kg, 1) + 1 secundario (null, null): read retorna secundario com fixado do principal", async () => {
      const item = await prisma.item.create({
        data: {
          nm_item: "Presenter Item A",
          nm_normalizado: "integracao-presenter-a",
          tp_item: item_type.insumo,
          cd_unidade_estoque: unidadeKgId,
          cd_unidade_uso_padrao: unidadeGId
        }
      });

      await prisma.itemCompra.create({
        data: {
          cd_item: item.cd_item,
          cd_fornecedor: supplierPrimaryId,
          cd_unidade_compra: unidadeKgId,
          cd_unidade_uso: unidadeKgId,
          sn_principal: true,
          vl_qtd_embalagem: "1.0000",
          vl_qtd_uso: "1.0000",
          vl_custo_compra: "10.0000",
          vl_custo_unitario_base: "10.000000"
        }
      });
      await prisma.itemCompra.create({
        data: {
          cd_item: item.cd_item,
          cd_fornecedor: supplierSecondaryId,
          cd_unidade_compra: unidadeKgId,
          sn_principal: false,
          vl_qtd_embalagem: "5.0000",
          vl_custo_compra: "40.0000",
          vl_custo_unitario_base: "8.000000"
        }
      });

      const detail = await repo.getItemDetail(item.cd_item);
      expect(detail).toBeTruthy();
      const primary = detail!.purchases.find((p) => p.purchaseIsPrimary)!;
      const secondary = detail!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(primary.usageUnit).toBe(KG);
      expect(secondary.usageUnit).toBe(KG);
      expect(secondary.usageQuantity).toBe(primary.usageQuantity);
      expect(secondary.usageIsFixedFromPrimary).toBe(true);
      expect(primary.usageIsFixedFromPrimary).toBe(false);
    });

    it("troca principal (mark secundario=true unidadeUso=g qtdeUso=1000): ex-principal passa a secundario derivado", async () => {
      const item = await prisma.item.create({
        data: {
          nm_item: "Presenter Item B",
          nm_normalizado: "integracao-presenter-b",
          tp_item: item_type.insumo,
          cd_unidade_estoque: unidadeKgId,
          cd_unidade_uso_padrao: unidadeGId
        }
      });

      await prisma.itemCompra.create({
        data: {
          cd_item: item.cd_item,
          cd_fornecedor: supplierPrimaryId,
          cd_unidade_compra: unidadeKgId,
          cd_unidade_uso: null,
          sn_principal: false,
          vl_qtd_embalagem: "1.0000",
          vl_qtd_uso: null,
          vl_custo_compra: "10.0000",
          vl_custo_unitario_base: "10.000000"
        }
      });
      await prisma.itemCompra.create({
        data: {
          cd_item: item.cd_item,
          cd_fornecedor: supplierSecondaryId,
          cd_unidade_compra: unidadeKgId,
          cd_unidade_uso: unidadeGId,
          sn_principal: true,
          vl_qtd_embalagem: "1.0000",
          vl_qtd_uso: "1000.0000",
          vl_custo_compra: "10.0000",
          vl_custo_unitario_base: "10.000000"
        }
      });

      const detail = await repo.getItemDetail(item.cd_item);
      const newPrimary = detail!.purchases.find((p) => p.purchaseIsPrimary)!;
      const exPrimary = detail!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(newPrimary.usageUnit).toBe(G);
      expect(newPrimary.usageQuantity).toBe("1000.0000");
      expect(exPrimary.usageUnit).toBe(G);
      expect(exPrimary.usageQuantity).toBe("1000.0000");
      expect(exPrimary.usageIsFixedFromPrimary).toBe(true);
    });

    it("fator por fornecedor (D-07): secundario qtdeCompra=10 -> fator=10/1=10", async () => {
      const item = await prisma.item.create({
        data: {
          nm_item: "Presenter Item C",
          nm_normalizado: "integracao-presenter-c",
          tp_item: item_type.insumo,
          cd_unidade_estoque: unidadeKgId,
          cd_unidade_uso_padrao: unidadeKgId
        }
      });

      await prisma.itemCompra.create({
        data: {
          cd_item: item.cd_item,
          cd_fornecedor: supplierPrimaryId,
          cd_unidade_compra: unidadeKgId,
          cd_unidade_uso: unidadeKgId,
          sn_principal: true,
          vl_qtd_embalagem: "1.0000",
          vl_qtd_uso: "1.0000",
          vl_custo_compra: "10.0000",
          vl_custo_unitario_base: "10.000000"
        }
      });
      await prisma.itemCompra.create({
        data: {
          cd_item: item.cd_item,
          cd_fornecedor: supplierSecondaryId,
          cd_unidade_compra: unidadeKgId,
          sn_principal: false,
          vl_qtd_embalagem: "10.0000",
          vl_custo_compra: "80.0000",
          vl_custo_unitario_base: "8.000000"
        }
      });

      const detail = await repo.getItemDetail(item.cd_item);
      const primary = detail!.purchases.find((p) => p.purchaseIsPrimary)!;
      const secondary = detail!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(Number(primary.conversionFactor)).toBe(1);
      expect(Number(primary.usagePrice)).toBe(10);
      expect(Number(secondary.conversionFactor)).toBe(10);
      expect(Number(secondary.usagePrice)).toBe(8);
    });
  }
);
