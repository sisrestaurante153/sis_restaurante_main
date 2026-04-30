// @ts-nocheck
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ItemType, UnidadeTipo } from "@/generated/prisma/client";
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
        where: { nomeNormalizado: { startsWith: "integracao-presenter" } }
      });

      const kg = await prisma.unidadeMedida.upsert({
        where: { codigo: KG },
        update: {},
        create: { codigo: KG, nome: "Kg presenter", tipo: UnidadeTipo.massa }
      });
      const g = await prisma.unidadeMedida.upsert({
        where: { codigo: G },
        update: {},
        create: { codigo: G, nome: "G presenter", tipo: UnidadeTipo.massa }
      });
      unidadeKgId = kg.id;
      unidadeGId = g.id;

      const supA = await prisma.fornecedor.upsert({
        where: { nome: "Presenter Fornecedor Primary" },
        update: {},
        create: { nome: "Presenter Fornecedor Primary" }
      });
      const supB = await prisma.fornecedor.upsert({
        where: { nome: "Presenter Fornecedor Secondary" },
        update: {},
        create: { nome: "Presenter Fornecedor Secondary" }
      });
      supplierPrimaryId = supA.id;
      supplierSecondaryId = supB.id;
    });

    afterAll(async () => {
      await closeIntegrationPrisma();
    });

    it("seed direto com 1 principal (kg, 1) + 1 secundario (null, null): read retorna secundario com fixado do principal", async () => {
      const item = await prisma.item.create({
        data: {
          nome: "Presenter Item A",
          nomeNormalizado: "integracao-presenter-a",
          tipoPrincipal: ItemType.insumo,
          unidadeEstoqueId: unidadeKgId,
          unidadeUsoPadraoId: unidadeGId
        }
      });

      await prisma.itemCompra.create({
        data: {
          itemId: item.id,
          fornecedorId: supplierPrimaryId,
          unidadeCompraId: unidadeKgId,
          unidadeUsoId: unidadeKgId,
          principal: true,
          quantidadePorEmbalagem: "1.0000",
          quantidadeUso: "1.0000",
          custoCompra: "10.0000",
          custoUnitarioBase: "10.000000"
        }
      });
      await prisma.itemCompra.create({
        data: {
          itemId: item.id,
          fornecedorId: supplierSecondaryId,
          unidadeCompraId: unidadeKgId,
          principal: false,
          quantidadePorEmbalagem: "5.0000",
          custoCompra: "40.0000",
          custoUnitarioBase: "8.000000"
        }
      });

      const detail = await repo.getItemDetail(item.id);
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
          nome: "Presenter Item B",
          nomeNormalizado: "integracao-presenter-b",
          tipoPrincipal: ItemType.insumo,
          unidadeEstoqueId: unidadeKgId,
          unidadeUsoPadraoId: unidadeGId
        }
      });

      // Inverter principal: primary=kg, secondary=g 1000 (marcado como novo principal)
      await prisma.itemCompra.create({
        data: {
          itemId: item.id,
          fornecedorId: supplierPrimaryId,
          unidadeCompraId: unidadeKgId,
          unidadeUsoId: null,
          principal: false,
          quantidadePorEmbalagem: "1.0000",
          quantidadeUso: null,
          custoCompra: "10.0000",
          custoUnitarioBase: "10.000000"
        }
      });
      await prisma.itemCompra.create({
        data: {
          itemId: item.id,
          fornecedorId: supplierSecondaryId,
          unidadeCompraId: unidadeKgId,
          unidadeUsoId: unidadeGId,
          principal: true,
          quantidadePorEmbalagem: "1.0000",
          quantidadeUso: "1000.0000",
          custoCompra: "10.0000",
          custoUnitarioBase: "10.000000"
        }
      });

      const detail = await repo.getItemDetail(item.id);
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
          nome: "Presenter Item C",
          nomeNormalizado: "integracao-presenter-c",
          tipoPrincipal: ItemType.insumo,
          unidadeEstoqueId: unidadeKgId,
          unidadeUsoPadraoId: unidadeKgId
        }
      });

      await prisma.itemCompra.create({
        data: {
          itemId: item.id,
          fornecedorId: supplierPrimaryId,
          unidadeCompraId: unidadeKgId,
          unidadeUsoId: unidadeKgId,
          principal: true,
          quantidadePorEmbalagem: "1.0000",
          quantidadeUso: "1.0000",
          custoCompra: "10.0000",
          custoUnitarioBase: "10.000000"
        }
      });
      await prisma.itemCompra.create({
        data: {
          itemId: item.id,
          fornecedorId: supplierSecondaryId,
          unidadeCompraId: unidadeKgId,
          principal: false,
          quantidadePorEmbalagem: "10.0000",
          custoCompra: "80.0000",
          custoUnitarioBase: "8.000000"
        }
      });

      const detail = await repo.getItemDetail(item.id);
      const primary = detail!.purchases.find((p) => p.purchaseIsPrimary)!;
      const secondary = detail!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(Number(primary.conversionFactor)).toBe(1);
      expect(Number(primary.usagePrice)).toBe(10);
      expect(Number(secondary.conversionFactor)).toBe(10);
      expect(Number(secondary.usagePrice)).toBe(8);
    });
  }
);
