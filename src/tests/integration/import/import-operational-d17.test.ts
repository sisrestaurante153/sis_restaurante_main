// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { item_type } from "@/generated/prisma/client";
import {
  closeIntegrationPrisma,
  getIntegrationPrisma,
  isIntegrationDatabaseAvailable
} from "@/tests/integration/helpers/prisma-test-env";
import { getCatalogRepository } from "@/modules/catalog/server/catalog-repository";

const runIntegration = await isIntegrationDatabaseAvailable();

describe.skipIf(!runIntegration)("import operacional D-17 defaults", () => {
  const prisma = getIntegrationPrisma();
  const repo = getCatalogRepository();

  beforeAll(async () => {
    const ownedItems = await prisma.item.findMany({
      where: { nm_normalizado: { startsWith: "import-d17" } },
      select: { cd_item: true }
    });
    const ownedItemIds = ownedItems.map((i) => i.cd_item);
    if (ownedItemIds.length > 0) {
      await prisma.itemCompra.deleteMany({ where: { cd_item: { in: ownedItemIds } } });
      await prisma.item.deleteMany({ where: { cd_item: { in: ownedItemIds } } });
    }
    await prisma.unidadeMedida.upsert({
      where: { ds_codigo: "kg" },
      update: {},
      create: { ds_codigo: "kg", nm_unidade: "Quilograma", tp_unidade: "massa" }
    });
  });

  afterAll(async () => {
    await closeIntegrationPrisma();
  });

  it("principal criado pelo import shape tem unidade_uso_id = unidade_compra_id e quantidade_uso = 1", async () => {
    const detail = await repo.saveItem({
      code: `IMP-D17-${Date.now()}`,
      name: "Import D17 Farinha",
      type: item_type.insumo,
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
          usageUnit: "kg",
          usageQuantity: "1.0000"
        }
      ]
    });

    expect(detail).toBeTruthy();
    const rows = await prisma.itemCompra.findMany({
      where: { cd_item: (detail as { id: string }).id },
      include: { unidadeCompra: true, unidadeUso: true }
    });
    expect(rows.length).toBe(1);
    const principal = rows[0];
    expect(principal.sn_principal).toBe(true);
    expect(principal.cd_unidade_uso).not.toBeNull();
    expect(principal.cd_unidade_compra).toBe(principal.cd_unidade_uso);
    expect(Number(principal.vl_qtd_uso)).toBe(1);
    expect(principal.unidadeUso?.ds_codigo).toBe("kg");
  });
});
