import { beforeEach, describe, expect, it } from "vitest";
import {
  getCatalogRepository,
  resetCatalogRepositoryForTests
} from "@/modules/catalog/server/catalog-repository";

describe("catalog repository", () => {
  beforeEach(() => {
    resetCatalogRepositoryForTests();
  });

  it("filters items by query and type", async () => {
    const repository = getCatalogRepository();

    const result = await repository.listItems({
      page: 1,
      pageSize: 10,
      query: "molho",
      type: "pre_preparo",
      status: "ativos"
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Molho Base de Tomate");
    expect(result.totalCount).toBe(1);
  });

  it("creates a new item and exposes conversion and purchase details", async () => {
    const repository = getCatalogRepository();

    const created = await repository.saveItem({
      code: "INS-900",
      name: "Farinha Panko",
      type: "insumo",
      operationalCategory: "Empanados",
      // Phase 08-04: stockUnit/usageUnit/conversionFactor top-level removidos — derivados do purchase principal.
      description: "Farinha seca para empanar.",
      active: true,
      purchases: [
        {
          supplierName: "Fornecedor Centro",
          purchaseUnit: "kg",
          purchaseIsPrimary: true,
          purchaseQuantity: "1.0000",
          purchaseCost: "18.5000",
          priceUpdatedAt: "2026-03-16",
          // D-02: fator = quantidadeCompra / quantidadeUso (ambos na mesma escala).
          // Neste caso: 1kg de farinha -> uso em kg (fator = 1/1 = 1).
          usageUnit: "kg",
          usageQuantity: "1.0000"
        }
      ]
    });

    const detail = await repository.getItemDetail(created.id);

    expect(detail?.purchase.unit).toBe("kg");
    expect(detail?.purchase.supplier).toBe("Fornecedor Centro");
    expect(detail?.purchase.purchaseIsPrimary).toBe(true);
    // Phase 08-04: demo-path deriva stockUnit/usageUnit/conversionFactor do purchase principal.
    // fator = qc/qu = 1/1 = 1.0000; usageQuantity = qc/fator = 1.0000; usagePrice = cost/fator = 18.5000.
    expect(detail?.usage.conversionFactor).toBe("1.0000");
    expect(detail?.usage.usageQuantity).toBe("1.0000");
    expect(detail?.usage.usagePrice).toBe("18.5000");
    expect(detail?.costs.direct).toBe("18.5000");
  });

  it("rejects duplicate editable codes", async () => {
    const repository = getCatalogRepository();

    await expect(
      repository.saveItem({
        code: "INS-001",
        name: "Tomate Italiano Duplicado",
        type: "insumo",
        operationalCategory: "Hortifruti",
        description: "Duplicado para teste.",
        active: true,
        purchases: [
          {
            supplierName: "Fornecedor Centro",
            purchaseUnit: "kg",
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "18.5000",
            priceUpdatedAt: "2026-03-16",
            usageUnit: "g",
            usageQuantity: "1000.0000"
          }
        ]
      })
    ).rejects.toMatchObject({
      fieldErrors: {
        code: ["Codigo ja cadastrado."]
      }
    });
  });

  it("blocks delete when the item is linked to fichas", async () => {
    const repository = getCatalogRepository();

    await expect(repository.deleteItem("item-molho")).resolves.toEqual({
      success: false,
      reason: "Este item esta vinculado a 2 fichas tecnicas. Inative-o ou remova os vinculos antes de excluir."
    });
  });

  it("deletes an item when there are no ficha links", async () => {
    const repository = getCatalogRepository();

    const result = await repository.deleteItem("item-combo");

    expect(result).toEqual({ success: true });
    await expect(repository.getItemDetail("item-combo")).resolves.toBeNull();
  });

  it("exposes operational category in item options for grouped ficha selection", async () => {
    const repository = getCatalogRepository();

    const options = await repository.listItemOptions();

    expect(options[0]).toMatchObject({
      operationalCategory: expect.any(String)
    });
  });
});
