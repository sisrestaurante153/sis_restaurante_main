import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ItemDetailPage from "@/app/(app)/itens/[itemId]/page";

vi.mock("@/modules/catalog/server/catalog-repository", () => ({
  getCatalogRepository: () => ({
    getItemDetail: async () => ({
      id: "item-1",
      code: "INS-001",
      name: "Arroz integral",
      description: "Grao base para pratos executivos.",
      type: "insumo",
      operationalCategory: "Graos",
      active: true,
      aliases: ["arroz", "rice"],
      stock: { unit: "kg" },
      usage: {
        unit: "g",
        conversionFactor: "1000.0000",
        usageQuantity: "0.0010",
        usagePrice: "0.0045"
      },
      purchase: {
        supplier: "Distribuidora ABC",
        priceUpdatedAt: "2026-03-12",
        baseUnitCost: "4.5000",
        purchaseIsPrimary: true,
        usageQuantity: "0.0010",
        usagePrice: "0.0045"
      },
      purchases: [
        {
          supplierName: "Distribuidora ABC",
          purchaseUnit: "kg",
          purchaseIsPrimary: true,
          purchaseQuantity: "1.0000",
          purchaseCost: "5.3000",
          priceUpdatedAt: "2026-03-12"
        }
      ],
      costs: {
        direct: "4.5000",
        inherited: "0.8000",
        total: "5.3000"
      },
      lastCalculationAt: "2026-03-12T10:00:00.000Z"
    })
  })
}));

vi.mock("@/modules/master-data/server/master-data-repository", () => ({
  getMasterDataRepository: () => ({
    getItemFormOptions: async () => ({
      typeOptions: [
        { value: "insumo", label: "Insumo" },
        { value: "prato", label: "Prato" }
      ],
      operationalCategoryOptions: ["Graos", "Montagem"],
      unitOptions: ["kg", "g", "un"],
      supplierOptions: ["Distribuidora ABC"]
    })
  })
}));

describe("ItemDetailPage", () => {
  it("renders the item form without the legacy side cards and keeps safe-delete feedback", async () => {
    render(
      await ItemDetailPage({
        params: Promise.resolve({ itemId: "item-1" }),
        searchParams: Promise.resolve({
          error:
            "Este%20item%20esta%20vinculado%20a%202%20fichas%20tecnicas.%20Inative-o%20ou%20remova%20os%20vinculos%20antes%20de%20excluir."
        })
      })
    );

    expect(screen.getByRole("heading", { name: /arroz integral/i })).toBeInTheDocument();
    expect(screen.queryByText("Rastreabilidade")).not.toBeInTheDocument();
    expect(screen.queryByText("Custos atuais")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Este item esta vinculado a 2 fichas tecnicas. Inative-o ou remova os vinculos antes de excluir."
      )
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /excluir item/i })).toHaveLength(2);
    // Pos 08-04: Identificacao enxuta com 5 campos (Codigo, Nome, Status, Tipo, Categoria).
    expect(screen.getByLabelText(/Codigo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do item/i)).toBeInTheDocument();
    // Qtde/Preco de uso agora vivem dentro dos cards de fornecedor (PurchasesEditor) em
    // "Detalhamento de Compras / Fornecedor", nao mais na Identificacao.
    expect(screen.getByText(/Detalhamento de Compras/i)).toBeInTheDocument();
    // Descricao operacional migrou para o Bloco 3 Observacoes (opcional).
    expect(screen.getByText(/^Observacoes$/i)).toBeInTheDocument();
  });
});
