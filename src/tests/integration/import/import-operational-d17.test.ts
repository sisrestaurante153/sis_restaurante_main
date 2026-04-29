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

/**
 * D-17 (import CSV default): o payload que `createOperationalItemImportAction`
 * passa a `catalogRepository.saveItem` para a linha importada precisa criar o
 * ItemCompra principal com `unidade_uso_id = unidade_compra_id` e
 * `quantidade_uso = 1`. Este spec exerce exatamente a shape do payload usado
 * pelo import-actions (ver src/modules/import/server/import-actions.ts linhas
 * 128-140 — objeto dentro de `purchases: [{ ... }]`).
 */
describe.skipIf(!runIntegration)("import operacional D-17 defaults", () => {
  const prisma = getIntegrationPrisma();
  const repo = getCatalogRepository();

  beforeAll(async () => {
    // Limpeza escopada apenas para os itens desta suite (nao afeta specs paralelos).
    const ownedItems = await prisma.item.findMany({
      where: { nomeNormalizado: { startsWith: "import-d17" } },
      select: { id: true }
    });
    const ownedItemIds = ownedItems.map((i) => i.id);
    if (ownedItemIds.length > 0) {
      await prisma.itemCompra.deleteMany({ where: { itemId: { in: ownedItemIds } } });
      await prisma.item.deleteMany({ where: { id: { in: ownedItemIds } } });
    }
    await prisma.unidadeMedida.upsert({
      where: { codigo: "kg" },
      update: {},
      create: { codigo: "kg", nome: "Quilograma", tipo: UnidadeTipo.massa }
    });
  });

  afterAll(async () => {
    await closeIntegrationPrisma();
  });

  it("principal criado pelo import shape tem unidade_uso_id = unidade_compra_id e quantidade_uso = 1", async () => {
    const detail = await repo.saveItem({
      code: `IMP-D17-${Date.now()}`,
      name: "Import D17 Farinha",
      type: ItemType.insumo,
      operationalCategory: "Operacional",
      description: "Payload espelhado do import-actions",
      active: true,
      purchases: [
        {
          supplierName: "Importacao operacional",
          purchaseUnit: "kg",
          purchaseIsPrimary: true,
          purchaseQuantity: "1.0000",
          purchaseCost: "8.9000",
          priceUpdatedAt: "2026-04-17",
          // D-17 defaults aplicados em import-actions.ts:
          usageUnit: "kg",
          usageQuantity: "1.0000"
        }
      ]
    });

    expect(detail).toBeTruthy();
    const rows = await prisma.itemCompra.findMany({
      where: { itemId: detail!.id },
      include: { unidadeCompra: true, unidadeUso: true }
    });
    expect(rows.length).toBe(1);
    const principal = rows[0];
    expect(principal.principal).toBe(true);
    expect(principal.unidadeUsoId).not.toBeNull();
    expect(principal.unidadeCompraId).toBe(principal.unidadeUsoId);
    expect(Number(principal.quantidadeUso)).toBe(1);
    expect(principal.unidadeUso?.codigo).toBe("kg");
  });
});
