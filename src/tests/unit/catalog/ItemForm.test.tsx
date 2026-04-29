import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemForm } from "@/modules/catalog/ui/item-form";

vi.mock("@/modules/catalog/server/catalog-actions", () => ({
  saveItemAction: vi.fn(),
  CatalogFormState: {}
}));

// Force desktop layout so PurchasesEditor renders cards (same pattern as purchases-editor.test.tsx).
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

const minimalInitialValues = {
  id: "item-1",
  code: "LF8NHE",
  name: "Arroz branco",
  type: "insumo",
  operationalCategory: "Graos",
  active: true,
  description: "",
  purchases: [
    {
      supplierName: "VMARKET",
      purchaseUnit: "kg",
      purchaseIsPrimary: true,
      purchaseQuantity: "1.0000",
      purchaseCost: "38.1100",
      priceUpdatedAt: "2026-04-06",
      usageUnit: "kg",
      usageQuantity: "1.0000",
      usageIsFixedFromPrimary: false
    }
  ]
};

function renderForm(extra: Record<string, unknown> = {}) {
  return render(
    <ItemForm
      typeOptions={[
        { value: "insumo", label: "Insumo" },
        { value: "prato", label: "Prato" }
      ]}
      operationalCategoryOptions={["Graos", "Carnes", "Laticinios"]}
      unitOptions={["kg", "g", "un"]}
      supplierOptions={["VMARKET", "Atacadao"]}
      initialValues={{ ...minimalInitialValues, ...(extra as object) }}
    />
  );
}

describe("ItemForm — SPEC-ITEM-LAYOUT + PDFV2-ITEM-05", () => {
  it("renderiza exatamente 3 blocos: Identificacao, Detalhamento de Compras/Fornecedor, Observacoes", () => {
    renderForm();
    // O HTML contrato (update/tela-item-v1.html) define 3 card-labels. O componente pre-refactor
    // tem um 4o FormSection "Descricao e detalhamento operacional" — nao pode existir.
    expect(screen.queryByText(/Descricao e detalhamento operacional/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Identificacao$/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalhamento de Compras/i)).toBeInTheDocument();
    expect(screen.getByText(/^Observacoes$/i)).toBeInTheDocument();
  });

  it("Identificacao contem exatamente 5 campos (Codigo, Nome, Tipo, Categoria, Status)", () => {
    renderForm();
    // Escopo: FormSection Identificacao renderiza-se como MuiCard envolvendo o heading "Identificacao".
    const heading = screen.getByText(/^Identificacao$/i);
    const card = heading.closest(".MuiCard-root") ?? heading.closest(".MuiPaper-root");
    expect(card).not.toBeNull();
    const scoped = within(card as HTMLElement);
    expect(scoped.getByLabelText(/Codigo/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/Nome do item/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/^Tipo/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/Categoria operacional/i)).toBeInTheDocument();
    expect(scoped.getByLabelText(/Status/i)).toBeInTheDocument();
  });

  it("Identificacao NAO contem campos de Unidade/Qtde/Preco/Fator", () => {
    renderForm();
    const heading = screen.getByText(/^Identificacao$/i);
    const card = heading.closest(".MuiCard-root") ?? heading.closest(".MuiPaper-root");
    const scoped = within(card as HTMLElement);
    expect(scoped.queryByLabelText(/Unidade de compra/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Unidade de uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Quantidade de compra/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Quantidade de uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Qtde de Uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Preco de compra/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Preco de uso/i)).not.toBeInTheDocument();
    expect(scoped.queryByLabelText(/Fator de conversao/i)).not.toBeInTheDocument();
  });

  it("Bloco Observacoes aparece APOS Detalhamento de Compras (ordem DOM)", () => {
    renderForm();
    const purchases = screen.getByText(/Detalhamento de Compras/i);
    const obs = screen.getByText(/^Observacoes$/i);
    // bit 4 = Node.DOCUMENT_POSITION_FOLLOWING
    expect(
      Boolean(purchases.compareDocumentPosition(obs) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
  });

  it("Descricao operacional aparece dentro do bloco Observacoes marcada como (opcional)", () => {
    renderForm();
    const heading = screen.getByText(/^Observacoes$/i);
    const card = heading.closest(".MuiCard-root") ?? heading.closest(".MuiPaper-root");
    expect(card).not.toBeNull();
    const scoped = within(card as HTMLElement);
    const textarea = scoped.getByLabelText(/Descricao operacional/i);
    expect(textarea).toBeInTheDocument();
    // A label deve conter o marcador (opcional).
    const host = (textarea as HTMLElement).closest(".MuiFormControl-root") ?? (textarea as HTMLElement).closest("label");
    expect(host?.textContent ?? "").toMatch(/opcional/i);
  });

  it("props removidas (stockUnit/usageUnit/conversionFactor) nao quebram o render", () => {
    // Passagem de props orfas via cast — deve ser silenciosamente ignorada pelo componente
    // pos-refactor (propriedades nao existem mais no ItemFormProps.initialValues).
    const initialValuesLoose = {
      ...minimalInitialValues,
      stockUnit: "kg",
      usageUnit: "g",
      conversionFactor: "1000.0000"
    } as unknown as typeof minimalInitialValues;
    expect(() =>
      render(
        <ItemForm
          typeOptions={[{ value: "insumo", label: "Insumo" }]}
          operationalCategoryOptions={["Graos"]}
          unitOptions={["kg", "g"]}
          supplierOptions={["VMARKET"]}
          initialValues={initialValuesLoose}
        />
      )
    ).not.toThrow();
  });

  it("cards laterais de rastreabilidade/custos ausentes (PDFV2-ITEM-05)", () => {
    renderForm();
    expect(screen.queryByText(/Rastreabilidade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Resumo de Custos/i)).not.toBeInTheDocument();
  });
});
