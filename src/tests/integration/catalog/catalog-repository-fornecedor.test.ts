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

const KG_CODE = "kg-forn-int";
const G_CODE = "g-forn-int";
const UN_CODE = "un-forn-int";

describe.skipIf(!runIntegration)(
  "catalog fornecedor integration (SPEC-ITEM-FORNECEDOR, D-05, D-07, D-08)",
  () => {
    const prisma = getIntegrationPrisma();
    const repo = getCatalogRepository();

    async function seedUnits() {
      await prisma.unidadeMedida.upsert({
        where: { codigo: KG_CODE },
        update: {},
        create: { codigo: KG_CODE, nome: "Quilograma Fornecedor Int", tipo: UnidadeTipo.massa }
      });
      await prisma.unidadeMedida.upsert({
        where: { codigo: G_CODE },
        update: {},
        create: { codigo: G_CODE, nome: "Grama Fornecedor Int", tipo: UnidadeTipo.massa }
      });
      await prisma.unidadeMedida.upsert({
        where: { codigo: UN_CODE },
        update: {},
        create: { codigo: UN_CODE, nome: "Unidade Fornecedor Int", tipo: UnidadeTipo.contagem }
      });
    }

    async function cleanup() {
      await prisma.custoSnapshotItem.deleteMany();
      await prisma.itemCompra.deleteMany();
      await prisma.conversaoUnidade.deleteMany();
      await prisma.itemAlias.deleteMany();
      await prisma.item.deleteMany({
        where: { nomeNormalizado: { startsWith: "integracao-fornecedor" } }
      });
    }

    beforeAll(async () => {
      await cleanup();
      await seedUnits();
    });

    afterAll(async () => {
      await closeIntegrationPrisma();
    });

    it("save principal persiste unidadeUsoId + quantidadeUso; secundario null (D-05)", async () => {
      const detail = await repo.saveItem({
        code: `FORN-INT-${Date.now()}`,
        name: "Integracao Fornecedor Farinha 1",
        type: ItemType.insumo,
        operationalCategory: "Secos",
        description: "",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor A Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "10.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "1000.0000"
          },
          {
            supplierName: "Fornecedor B Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: false,
            purchaseQuantity: "5.0000",
            purchaseCost: "40.0000",
            priceUpdatedAt: "2026-04-17"
          }
        ]
      });

      expect(detail).toBeTruthy();
      const rows = await prisma.itemCompra.findMany({
        where: { itemId: detail!.id },
        orderBy: { principal: "desc" }
      });
      expect(rows.length).toBe(2);

      const primary = rows.find((r) => r.principal)!;
      const secondary = rows.find((r) => !r.principal)!;
      expect(primary.unidadeUsoId).not.toBeNull();
      expect(primary.quantidadeUso).not.toBeNull();
      expect(Number(primary.quantidadeUso)).toBe(1000);
      expect(secondary.unidadeUsoId).toBeNull();
      expect(secondary.quantidadeUso).toBeNull();
    });

    it("secundario com usageUnit enviado no payload: escrita ignora (D-05)", async () => {
      const detail = await repo.saveItem({
        code: `FORN-INT2-${Date.now()}`,
        name: "Integracao Fornecedor Farinha 2",
        type: ItemType.insumo,
        operationalCategory: "Secos",
        description: "",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor C Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "10.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "1000.0000"
          },
          {
            supplierName: "Fornecedor D Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: false,
            purchaseQuantity: "5.0000",
            purchaseCost: "40.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "500.0000"
          }
        ]
      });

      const rows = await prisma.itemCompra.findMany({
        where: { itemId: detail!.id }
      });
      const secondary = rows.find((r) => !r.principal)!;
      expect(secondary.unidadeUsoId).toBeNull();
      expect(secondary.quantidadeUso).toBeNull();
    });

    it("read retorna secundario com usageUnit derivado do principal (D-05)", async () => {
      const saved = await repo.saveItem({
        code: `FORN-INT3-${Date.now()}`,
        name: "Integracao Fornecedor Farinha 3",
        type: ItemType.insumo,
        operationalCategory: "Secos",
        description: "",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor E Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "10.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "1000.0000"
          },
          {
            supplierName: "Fornecedor F Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: false,
            purchaseQuantity: "5.0000",
            purchaseCost: "40.0000",
            priceUpdatedAt: "2026-04-17"
          }
        ]
      });

      const detail = await repo.getItemDetail(saved!.id);
      const primary = detail!.purchases.find((p) => p.purchaseIsPrimary)!;
      const secondary = detail!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(primary.usageUnit).toBe(G_CODE);
      expect(secondary.usageUnit).toBe(G_CODE);
      expect(secondary.usageQuantity).toBe(primary.usageQuantity);
      expect(secondary.usageIsFixedFromPrimary).toBe(true);
      expect(primary.usageIsFixedFromPrimary).toBe(false);
    });

    it("toggle principal propaga fixado automaticamente no read seguinte (D-06)", async () => {
      const saved = await repo.saveItem({
        code: `FORN-INT4-${Date.now()}`,
        name: "Integracao Fornecedor Farinha 4",
        type: ItemType.insumo,
        operationalCategory: "Secos",
        description: "",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor G Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "10.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "1000.0000"
          },
          {
            supplierName: "Fornecedor H Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: false,
            purchaseQuantity: "2.0000",
            purchaseCost: "16.0000",
            priceUpdatedAt: "2026-04-17"
          }
        ]
      });

      // Toggle: H passa a ser principal com g
      const updated = await repo.saveItem({
        id: saved!.id,
        code: saved!.code,
        name: saved!.name,
        type: ItemType.insumo,
        operationalCategory: "Secos",
        description: "",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor G Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: false,
            purchaseQuantity: "1.0000",
            purchaseCost: "10.0000",
            priceUpdatedAt: "2026-04-17"
          },
          {
            supplierName: "Fornecedor H Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "2.0000",
            purchaseCost: "16.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "2000.0000"
          }
        ]
      });

      const newPrimary = updated!.purchases.find((p) => p.purchaseIsPrimary)!;
      const newSecondary = updated!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(newPrimary.supplierName).toBe("Fornecedor H Integracao");
      expect(newPrimary.usageQuantity).toBe("2000.0000");
      expect(newSecondary.usageQuantity).toBe("2000.0000");
      expect(newSecondary.usageIsFixedFromPrimary).toBe(true);
    });

    it("precoUso por fornecedor usa seus proprios valores (D-07)", async () => {
      const saved = await repo.saveItem({
        code: `FORN-INT5-${Date.now()}`,
        name: "Integracao Fornecedor Farinha 5",
        type: ItemType.insumo,
        operationalCategory: "Secos",
        description: "",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor I Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "10.0000",
            priceUpdatedAt: "2026-04-17",
            usageUnit: KG_CODE,
            usageQuantity: "1.0000"
          },
          {
            supplierName: "Fornecedor J Integracao",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: false,
            purchaseQuantity: "10.0000",
            purchaseCost: "80.0000",
            priceUpdatedAt: "2026-04-17"
          }
        ]
      });

      const primary = saved!.purchases.find((p) => p.purchaseIsPrimary)!;
      const secondary = saved!.purchases.find((p) => !p.purchaseIsPrimary)!;
      expect(Number(primary.conversionFactor)).toBe(1);
      expect(Number(primary.usagePrice)).toBe(10);
      // secundario: qc=10, qu_derivado=1 -> fator=10, precoUso=80/10=8
      expect(Number(secondary.conversionFactor)).toBe(10);
      expect(Number(secondary.usagePrice)).toBe(8);
    });

    it("save rejeita 2 principais via Zod superRefine (D-08)", async () => {
      // Este teste depende do parser Zod no nivel da action/form. Como repo.saveItem aceita
      // o SaveItemInput diretamente, validamos o comportamento: o repository nao deve aceitar 2 principais.
      // O contrato Phase 8 D-08 e que a Zod schema rejeita na action layer; aqui testamos no parser.
      const { parseItemFormData } = await import("@/modules/catalog/server/item-form-schema");
      const fd = new FormData();
      fd.set("id", "");
      fd.set("code", "DUP-PRIN-1");
      fd.set("name", "Dup principais");
      fd.set("type", "insumo");
      fd.set("operationalCategory", "Secos");
      fd.set("stockUnit", KG_CODE);
      fd.set("usageUnit", G_CODE);
      fd.set("conversionFactor", "1");
      fd.set("description", "");
      fd.set("active", "true");
      fd.set(
        "purchasesJson",
        JSON.stringify([
          {
            supplierName: "X",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1",
            purchaseCost: "1",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "1"
          },
          {
            supplierName: "Y",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1",
            purchaseCost: "1",
            priceUpdatedAt: "2026-04-17",
            usageUnit: G_CODE,
            usageQuantity: "1"
          }
        ])
      );
      const parsed = parseItemFormData(fd);
      expect(parsed.success).toBe(false);
    });

    it("save rejeita principal sem usageUnit/usageQuantity via Zod superRefine (D-08)", async () => {
      const { parseItemFormData } = await import("@/modules/catalog/server/item-form-schema");
      const fd = new FormData();
      fd.set("id", "");
      fd.set("code", "MISS-USE-1");
      fd.set("name", "Sem usageUnit");
      fd.set("type", "insumo");
      fd.set("operationalCategory", "Secos");
      fd.set("stockUnit", KG_CODE);
      fd.set("usageUnit", G_CODE);
      fd.set("conversionFactor", "1");
      fd.set("description", "");
      fd.set("active", "true");
      fd.set(
        "purchasesJson",
        JSON.stringify([
          {
            supplierName: "X",
            purchaseUnit: KG_CODE,
            purchaseIsPrimary: true,
            purchaseQuantity: "1",
            purchaseCost: "1",
            priceUpdatedAt: "2026-04-17"
            // no usageUnit, no usageQuantity — should fail
          }
        ])
      );
      const parsed = parseItemFormData(fd);
      expect(parsed.success).toBe(false);
    });
  }
);
