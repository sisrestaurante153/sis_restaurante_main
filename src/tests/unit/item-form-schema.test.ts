import { describe, expect, it } from "vitest";
import { parseItemFormData } from "@/modules/catalog/server/item-form-schema";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

function buildFormDataWithArrays(
  entries: Record<string, string>,
  arrayEntries: Record<string, string[]>
) {
  const formData = buildFormData(entries);

  for (const [key, values] of Object.entries(arrayEntries)) {
    for (const value of values) {
      formData.append(key, value);
    }
  }

  return formData;
}

describe("item form schema", () => {
  it("parses a valid item payload", () => {
    const result = parseItemFormData(
      buildFormData({
        code: "INS-123",
        name: "Farinha Panko",
        type: "insumo",
        operationalCategory: "Empanados",
        description: "Farinha seca para empanar.",
        active: "true",
        purchasesJson: JSON.stringify([
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
        ])
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe("Farinha Panko");
      expect(result.data.code).toBe("INS-123");
      expect(result.data.active).toBe(true);
      expect(result.data.purchases).toHaveLength(1);
      expect(result.data.purchases[0]?.supplierName).toBe("Fornecedor Centro");
      expect(result.data.purchases[0]?.purchaseIsPrimary).toBe(true);
      expect(result.data.purchases[0]?.purchaseCost).toBe("18.5000");
      expect(result.data.purchases[0]?.priceUpdatedAt).toBe("2026-03-16");
    }
  });

  it("rejects missing required fields and invalid purchase rows", () => {
    const result = parseItemFormData(
      buildFormData({
        code: "",
        name: "",
        type: "insumo",
        operationalCategory: "",
        description: "",
        active: "true",
        purchasesJson: JSON.stringify([
          {
            supplierName: "",
            purchaseUnit: "kg",
            purchaseQuantity: "0",
            purchaseCost: "-1",
            priceUpdatedAt: ""
          }
        ])
      })
    );

    expect(result.success).toBe(false);
  });

  it("rejects malformed purchase collections", () => {
    const result = parseItemFormData(
      buildFormData({
        code: "INS-123",
        name: "Farinha Panko",
        type: "insumo",
        operationalCategory: "Empanados",
        description: "Farinha seca para empanar.",
        active: "true",
        purchasesJson: "nao-json"
      })
    );

    expect(result.success).toBe(false);
  });

  it("prefers repeated purchase form fields over the serialized mirror", () => {
    const result = parseItemFormData(
      buildFormDataWithArrays(
        {
          code: "INS-123",
          name: "Farinha Panko",
          type: "insumo",
          operationalCategory: "Empanados",
          description: "Farinha seca para empanar.",
          active: "true",
          purchasesJson: JSON.stringify([
            {
              supplierName: "Fornecedor Antigo",
              purchaseUnit: "kg",
              purchaseIsPrimary: false,
              purchaseQuantity: "1.0000",
              purchaseCost: "18.5000",
              priceUpdatedAt: "2026-03-16"
            }
          ])
        },
        {
          purchaseSupplierName: ["Fornecedor Atual"],
          purchaseUnit: ["kg"],
          purchaseIsPrimary: ["true"],
          purchaseQuantity: ["1.0000"],
          purchaseCost: ["22.0000"],
          purchasePriceUpdatedAt: ["2026-03-16"],
          purchaseUsageUnit: ["g"],
          purchaseUsageQuantity: ["1000.0000"]
        }
      )
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.purchases[0]?.supplierName).toBe("Fornecedor Atual");
      expect(result.data.purchases[0]?.purchaseIsPrimary).toBe(true);
      expect(result.data.purchases[0]?.purchaseCost).toBe("22.0000");
    }
  });

  it("preserva erros aninhados per-row em keys purchases.N.campo (Quick 20260421 T1)", () => {
    // Fornecedor 1 OK (principal); Fornecedor 2 com purchaseCost invalido ("0")
    // e supplierName vazio deve produzir erros keyed por "purchases.1.*".
    const result = parseItemFormData(
      buildFormData({
        code: "INS-999",
        name: "Farinha",
        type: "insumo",
        operationalCategory: "Empanados",
        description: "",
        active: "true",
        purchasesJson: JSON.stringify([
          {
            supplierName: "Fornecedor Centro",
            purchaseUnit: "kg",
            purchaseIsPrimary: true,
            purchaseQuantity: "1.0000",
            purchaseCost: "18.5000",
            priceUpdatedAt: "2026-03-16",
            usageUnit: "g",
            usageQuantity: "1000.0000"
          },
          {
            supplierName: "",
            purchaseUnit: "kg",
            purchaseIsPrimary: false,
            purchaseQuantity: "1.0000",
            purchaseCost: "0",
            priceUpdatedAt: "2026-03-16"
          }
        ])
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      // As keys aninhadas devem aparecer no errors map
      expect(result.errors["purchases.1.supplierName"]).toBeDefined();
      expect(result.errors["purchases.1.purchaseCost"]).toBeDefined();
      // Fornecedor 1 (principal) nao deve ter erros aninhados
      expect(result.errors["purchases.0.supplierName"]).toBeUndefined();
      expect(result.errors["purchases.0.purchaseCost"]).toBeUndefined();
    }
  });

  it("normalizes a single purchase as primary when no marker is provided", () => {
    const result = parseItemFormData(
      buildFormData({
        code: "INS-124",
        name: "Farinha Panko",
        type: "insumo",
        operationalCategory: "Empanados",
        description: "Farinha seca para empanar.",
        active: "true",
        purchasesJson: JSON.stringify([
          {
            supplierName: "Fornecedor Centro",
            purchaseUnit: "kg",
            purchaseQuantity: "1.0000",
            purchaseCost: "18.5000",
            priceUpdatedAt: "2026-03-16",
            usageUnit: "g",
            usageQuantity: "1000.0000"
          }
        ])
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.purchases[0]?.purchaseIsPrimary).toBe(true);
    }
  });
});
