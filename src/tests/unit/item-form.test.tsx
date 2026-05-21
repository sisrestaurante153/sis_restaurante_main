import { fireEvent, render, screen } from "@testing-library/react";
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

const TYPE_OPTIONS = [
  { value: "insumo", label: "Insumo" },
  { value: "prato", label: "Prato" },
  { value: "embalagem", label: "Embalagem" }
];
const CATEGORY_OPTIONS = ["Graos", "Proteinas", "Hortifruti"];
const UNIT_OPTIONS = ["kg", "g", "l", "ml", "un"];

describe("ItemForm — registro (novo item)", () => {
  it("gera código numérico de 6 dígitos automaticamente", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} />);
    const codigoInput = screen.getByLabelText(/codigo/i) as HTMLInputElement;
    expect(codigoInput.value).toMatch(/^\d{6}$/);
  });

  it("campo Nome do item começa vazio", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} />);
    const nomeInput = screen.getByLabelText(/nome do item/i) as HTMLInputElement;
    expect(nomeInput.value).toBe("");
  });

  it("botão 'Gerar novo código' altera o valor do campo Codigo", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} />);
    const codigoInput = screen.getByLabelText(/codigo/i) as HTMLInputElement;
    const original = codigoInput.value;

    const btn = screen.getByRole("button", { name: /gerar novo código/i });
    let novo = original;
    for (let i = 0; i < 5 && novo === original; i++) {
      fireEvent.click(btn);
      novo = (screen.getByLabelText(/codigo/i) as HTMLInputElement).value;
    }
    expect(novo).toMatch(/^\d{6}$/);
  });

  it("Status padrão é Ativo (value='true') no novo item", () => {
    const { container } = render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} />);
    // MUI Select renderiza um <input type="hidden" name="active"> para o form submission
    const hidden = container.querySelector('input[name="active"]') as HTMLInputElement;
    expect(hidden?.value).toBe("true");
  });

  it("renderiza o label do select Tipo na tela", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} />);
    expect(screen.getByLabelText(/^tipo/i)).toBeInTheDocument();
  });
});

describe("ItemForm — edição (item existente)", () => {
  const ITEM_EDIT = {
    id: "item-xyz",
    code: "INS-042",
    name: "Feijao Carioca",
    description: "Feijao tipo 1, grao medio.",
    type: "insumo",
    operationalCategory: "Graos",
    active: true,
    purchases: [
      {
        supplierName: "Distribuidora ABC",
        purchaseUnit: "kg",
        purchaseIsPrimary: true,
        purchaseQuantity: "5.0000",
        purchaseCost: "18.5000",
        priceUpdatedAt: "2026-05-01",
        usageUnit: "kg",
        usageQuantity: "5.0000",
        usageIsFixedFromPrimary: false
      }
    ]
  };

  it("campo Codigo exibe o código do item existente (não gera novo)", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} initialValues={ITEM_EDIT} />);
    expect((screen.getByLabelText(/codigo/i) as HTMLInputElement).value).toBe("INS-042");
  });

  it("campo Nome do item exibe o nome do item existente", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} initialValues={ITEM_EDIT} />);
    expect((screen.getByLabelText(/nome do item/i) as HTMLInputElement).value).toBe("Feijao Carioca");
  });

  it("campo Descricao exibe o texto do item existente", () => {
    render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} initialValues={ITEM_EDIT} />);
    const textarea = screen.getByPlaceholderText(/arroz marca/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Feijao tipo 1, grao medio.");
  });

  it("Status exibe value='true' para item ativo", () => {
    const { container } = render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} initialValues={{ ...ITEM_EDIT, active: true }} />);
    const hidden = container.querySelector('input[name="active"]') as HTMLInputElement;
    expect(hidden?.value).toBe("true");
  });

  it("Status exibe value='false' para item inativo", () => {
    const { container } = render(<ItemForm typeOptions={TYPE_OPTIONS} operationalCategoryOptions={CATEGORY_OPTIONS} unitOptions={UNIT_OPTIONS} initialValues={{ ...ITEM_EDIT, active: false }} />);
    const hidden = container.querySelector('input[name="active"]') as HTMLInputElement;
    expect(hidden?.value).toBe("false");
  });
});
