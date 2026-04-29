import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PurchasesEditor, type PurchaseRow } from "@/modules/catalog/ui/purchases-editor";

// Force desktop layout for the pixel-perfect HTML contract (update/tela-item-v1.html 227-362).
// The global setup mocks matchMedia with matches:false (mobile). We override for this spec
// to exercise the card-with-grid layout where Unidade de uso / Qtde de uso / Fator live.
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

function makePrimary(overrides: Partial<PurchaseRow> = {}): PurchaseRow {
  return {
    supplierName: "VMARKET",
    purchaseUnit: "kg",
    purchaseIsPrimary: true,
    purchaseQuantity: "10.0000",
    purchaseCost: "80.0000",
    priceUpdatedAt: "2026-04-01",
    usageUnit: "kg",
    usageQuantity: "1.0000",
    usageIsFixedFromPrimary: false,
    ...overrides
  };
}

function makeSecondary(overrides: Partial<PurchaseRow> = {}): PurchaseRow {
  return {
    supplierName: "Atacadao",
    purchaseUnit: "fardo",
    purchaseIsPrimary: false,
    purchaseQuantity: "10.0000",
    purchaseCost: "80.0000",
    priceUpdatedAt: "",
    usageUnit: "",
    usageQuantity: "",
    usageIsFixedFromPrimary: true,
    ...overrides
  };
}

function renderEditor(rows: PurchaseRow[]) {
  const onRowsChange = vi.fn();
  const utils = render(
    <PurchasesEditor
      rows={rows}
      onRowsChange={onRowsChange}
      supplierOptions={["VMARKET", "Atacadao", "Mercado livre"]}
      unitOptions={["kg", "g", "l", "ml", "un", "fardo"]}
      purchaseUnit="kg"
    />
  );
  return { onRowsChange, ...utils };
}

describe("PurchasesEditor — SPEC-ITEM-FORNECEDOR (D-05, D-06, D-07, D-08, D-11)", () => {
  it("principal sozinho: sem badge fixado, campos Unidade de uso + Qtde de uso editaveis", () => {
    renderEditor([makePrimary()]);

    // No "fixado do 1o fornecedor" badge when only the principal exists
    expect(screen.queryByText(/fixado do 1/i)).toBeNull();

    // Editable inputs for Unidade de uso + Qtde de uso exist on the principal
    const unidadeUso = screen.getByLabelText(/unidade de uso/i);
    const qtdeUso = screen.getByLabelText(/quantidade de uso|qtde de uso/i);
    expect(unidadeUso).toBeInTheDocument();
    expect(qtdeUso).toBeInTheDocument();
    // Principal editable: not aria-readonly
    expect(unidadeUso.getAttribute("aria-readonly")).not.toBe("true");
    expect(qtdeUso.getAttribute("aria-readonly")).not.toBe("true");
  });

  it("principal + secundario: badge 'fixado do 1o fornecedor' aparece 2x (Unidade uso + Qtde uso)", () => {
    renderEditor([makePrimary(), makeSecondary()]);

    const badges = screen.getAllByText(/fixado do 1.*fornecedor/i);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it("secundario deriva usageUnit client-side do principal (D-05)", () => {
    renderEditor([
      makePrimary({ usageUnit: "kg", usageQuantity: "1.0000" }),
      makeSecondary({ usageUnit: "", usageQuantity: "" })
    ]);

    // There should be 2 inputs labeled "Unidade de uso" (one per card).
    const unidadeInputs = screen.getAllByLabelText(/unidade de uso/i) as HTMLInputElement[];
    expect(unidadeInputs.length).toBeGreaterThanOrEqual(2);
    // Secondary one derives from primary's "kg"
    const derived = unidadeInputs.find(
      (el) => el.getAttribute("aria-readonly") === "true"
    );
    expect(derived).toBeDefined();
    expect(derived!.value).toBe("kg");
  });

  it("secundario tem Unidade de uso e Qtde de uso com aria-readonly=true (D-05 readonly)", () => {
    renderEditor([makePrimary(), makeSecondary()]);

    const readonlyEls = screen
      .getAllByRole("textbox")
      .filter((el) => el.getAttribute("aria-readonly") === "true");
    // At least: secondary unidade uso, secondary qtde uso, primary fator, secondary fator,
    // primary preco uso, secondary preco uso — expect >= 2 (unidade/qtde uso of secondary)
    expect(readonlyEls.length).toBeGreaterThanOrEqual(2);
  });

  it("Fator derivado no principal = qtdeCompra/qtdeUso (10/1 = 10.0000)", () => {
    renderEditor([
      makePrimary({ purchaseQuantity: "10.0000", usageQuantity: "1.0000" })
    ]);

    const fator = screen.getByLabelText(/fator de conversao/i) as HTMLInputElement;
    expect(fator.value).toBe("10.0000");
    // Fator is readonly green
    expect(fator.getAttribute("aria-readonly")).toBe("true");
    expect(screen.getAllByText(/calculado automaticamente/i).length).toBeGreaterThanOrEqual(1);
  });

  it("Preco de uso no secundario usa seu proprio fator (D-07): 80/10=8.0000, NAO o fator do principal", () => {
    // principal: qtdeCompra=1, usageQuantity=1, fator=1, cost=80, precoUso=80
    // secundario: qtdeCompra=10, usageQuantity=derived(1), fator=10, cost=80, precoUso=80/10=8
    renderEditor([
      makePrimary({ purchaseQuantity: "1.0000", purchaseCost: "80.0000", usageQuantity: "1.0000" }),
      makeSecondary({ purchaseQuantity: "10.0000", purchaseCost: "80.0000" })
    ]);

    const precoUsoInputs = screen.getAllByLabelText(/preco de uso/i) as HTMLInputElement[];
    expect(precoUsoInputs.length).toBe(2);
    // Find the input that shows 8.0000 (secondary) and 80.0000 (primary) — D-07 proof
    const values = precoUsoInputs.map((el) => el.value);
    expect(values).toContain("80.0000");
    expect(values).toContain("8.0000");
  });

  it("Remover aparece so em secundarios (principal sem botao Remover)", () => {
    renderEditor([makePrimary(), makeSecondary()]);
    const removeButtons = screen.getAllByRole("button", { name: /remover fornecedor/i });
    // Only the secondary row has a remove button
    expect(removeButtons.length).toBe(1);
  });

  it("Adicionar fornecedor adiciona row com purchaseIsPrimary=false, usageUnit='' e usageQuantity=''", () => {
    const { onRowsChange } = renderEditor([makePrimary()]);

    const addBtn = screen.getByRole("button", { name: /adicionar fornecedor/i });
    fireEvent.click(addBtn);

    expect(onRowsChange).toHaveBeenCalledTimes(1);
    const updated: PurchaseRow[] = onRowsChange.mock.calls[0]?.[0] as PurchaseRow[];
    expect(updated.length).toBe(2);
    const added = updated[1];
    expect(added.purchaseIsPrimary).toBe(false);
    expect(added.usageUnit).toBe("");
    expect(added.usageQuantity).toBe("");
    expect(added.usageIsFixedFromPrimary).toBe(true);
    // Primary stays primary
    expect(updated[0].purchaseIsPrimary).toBe(true);
  });

  it("toggle principal em secundario: reseta demais para false + exibe 'Campos fixados atualizados a partir de {nome}' (D-06)", () => {
    const { onRowsChange } = renderEditor([makePrimary(), makeSecondary({ supplierName: "Atacadao" })]);

    const toggleBtn = screen.getByRole("button", { name: /tornar principal/i });
    fireEvent.click(toggleBtn);

    expect(onRowsChange).toHaveBeenCalledTimes(1);
    const updated = onRowsChange.mock.calls[0]?.[0] as PurchaseRow[];
    // Only the 2nd row is primary now; others reset to false
    expect(updated[0].purchaseIsPrimary).toBe(false);
    expect(updated[1].purchaseIsPrimary).toBe(true);

    // Alert visible with the new primary's name
    expect(screen.getByText(/campos fixados atualizados a partir de atacadao/i)).toBeInTheDocument();
  });
});
