import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemForm } from "@/modules/catalog/ui/item-form";

vi.mock("@/modules/catalog/server/catalog-actions", () => ({
  saveItemAction: vi.fn(),
  CatalogFormState: {}
}));

describe("ItemForm", () => {
  it("renders the operational item contract (pos 08-04 identificacao enxuta)", () => {
    render(
      <ItemForm
        typeOptions={[
          { value: "insumo", label: "Insumo" },
          { value: "prato", label: "Prato" }
        ]}
        operationalCategoryOptions={["Graos", "Empanados"]}
        unitOptions={["kg", "g", "un"]}
        supplierOptions={["Distribuidora ABC", "Fornecedor Centro"]}
        initialValues={{
          id: "item-1",
          code: "PRT-001",
          name: "Arroz integral",
          description: "Grao base para pratos executivos.",
          type: "prato",
          operationalCategory: "Empanados",
          active: true,
          purchases: [
            {
              supplierName: "Distribuidora ABC",
              purchaseUnit: "kg",
              purchaseIsPrimary: true,
              purchaseQuantity: "1.0000",
              purchaseCost: "5.3000",
              priceUpdatedAt: "2026-03-12",
              usageUnit: "un",
              usageQuantity: "1.0000",
              usageIsFixedFromPrimary: false
            }
          ]
        }}
      />
    );

    // 3 FormSection: Identificacao, Detalhamento de Compras/Fornecedor, Observacoes.
    expect(screen.getByText(/^Identificacao$/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalhamento de Compras/i)).toBeInTheDocument();
    expect(screen.getByText(/^Observacoes$/i)).toBeInTheDocument();
    // Bloco removido na Phase 8-04.
    expect(screen.queryByText(/Descricao e detalhamento operacional/i)).not.toBeInTheDocument();

    // Identificacao contem 5 campos.
    expect(screen.getByLabelText(/Codigo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do item/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Distribuidora ABC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar fornecedor/i })).toBeInTheDocument();
  });

  // Phase 09-02 D-13: FormSection sem subtitle (card-label bate 1:1 com HTML linha 56).
  it("does not render the legacy 'Dados mestres' subtitle in the Identificacao FormSection", () => {
    render(<ItemForm />);
    expect(screen.queryByText(/Dados mestres para identificar/i)).toBeNull();
  });

  it("keeps the Identificacao overline label visible", () => {
    render(<ItemForm />);
    expect(screen.getByText(/^Identificacao$/i)).toBeInTheDocument();
  });

  it("keeps the Observacoes overline label visible", () => {
    render(<ItemForm />);
    expect(screen.getByText(/^Observacoes$/i)).toBeInTheDocument();
  });
});
