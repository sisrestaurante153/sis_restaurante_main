import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@mui/material/Box", () => ({
  default: ({ children, component, ...props }: React.ComponentPropsWithoutRef<"div"> & { component?: string }) => {
    const Tag = (component ?? "div") as React.ElementType;
    return <Tag {...props}>{children}</Tag>;
  }
}));

vi.mock("@mui/material/Typography", () => ({
  default: ({ children, component, htmlFor, ...props }: React.ComponentPropsWithoutRef<"span"> & { component?: string; htmlFor?: string }) => {
    const Tag = (component ?? "span") as React.ElementType;
    return <Tag htmlFor={htmlFor} {...props}>{children}</Tag>;
  }
}));

vi.mock("@/components/ui/FormSection", () => ({
  FormSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}));

import type { ComponentsEditorSummary } from "@/modules/engineering/ui/components-editor.types";
import { TotaisIndicadores } from "@/modules/engineering/ui/TotaisIndicadores";

function buildSummary(overrides: Partial<ComponentsEditorSummary> = {}): ComponentsEditorSummary {
  return {
    totalGross: "0.745",
    totalNet: "0.745",
    postCookingWeight: "0.745",
    cookingFactorGross: "1",
    cookingFactorNet: "1",
    totalInputCost: "15.46",
    costWithoutPackagingPerKg: "20.76",
    costWithPackagingPerKg: "23.22",
    cmvPerKg: "20.76",
    packagingCost: "1.93",
    finalAppliedCmv: "20.76",
    cmvHealthStatus: "Saudavel",
    cmvPercentOfSale: "0.2092",
    costReal: "18.39",
    contributionMarginValue: "56.33",
    contributionMarginPercent: "0.6408",
    variableExpenseApplied: "13.19",
    referencePrice: "87.90",
    assemblyEnabled: false,
    ...overrides
  };
}

describe("TotaisIndicadores — tabela de referência de CMV", () => {
  it("exibe o cabeçalho 'Referência de CMV'", () => {
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput="0.15"
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    expect(screen.getByText(/referência de cmv/i)).toBeInTheDocument();
  });

  it("exibe as três faixas de CMV: Crítico, Atenção e Saudável", () => {
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput="0.15"
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    expect(screen.getByText(/crítico/i)).toBeInTheDocument();
    expect(screen.getByText(/atenção/i)).toBeInTheDocument();
    expect(screen.getByText(/saudável/i)).toBeInTheDocument();
  });

  it("exibe os intervalos percentuais corretos na tabela", () => {
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput="0.15"
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    expect(screen.getByText(/0%\s*[–-]\s*30%/i)).toBeInTheDocument();
    expect(screen.getByText(/30%\s*[–-]\s*60%/i)).toBeInTheDocument();
    expect(screen.getByText(/60%\+/i)).toBeInTheDocument();
  });
});

describe("TotaisIndicadores — campo Preco de venda (separador decimal)", () => {
  it("converte vírgula para ponto ao chamar onSalePriceChange", () => {
    const onChange = vi.fn();
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput=""
        variableExpensePercentInput="0.15"
        onSalePriceChange={onChange}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    const input = screen.getByLabelText(/preco de venda/i);
    fireEvent.change(input, { target: { value: "87,90" } });
    expect(onChange).toHaveBeenCalledWith("87.90");
  });

  it("passa valor com ponto sem alteração", () => {
    const onChange = vi.fn();
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput=""
        variableExpensePercentInput="0.15"
        onSalePriceChange={onChange}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    const input = screen.getByLabelText(/preco de venda/i);
    fireEvent.change(input, { target: { value: "87.90" } });
    expect(onChange).toHaveBeenCalledWith("87.90");
  });
});

describe("TotaisIndicadores — campo Despesa variavel (%PV) (separador decimal)", () => {
  it("converte vírgula para ponto ao chamar onVariableExpensePercentChange", () => {
    const onChange = vi.fn();
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput=""
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={onChange}
      />
    );
    const input = screen.getByLabelText(/despesa variavel de venda/i);
    fireEvent.change(input, { target: { value: "15,5" } });
    expect(onChange).toHaveBeenCalledWith("15.5");
  });
});

describe("TotaisIndicadores — Quadro final", () => {
  it("renderiza a seção 'Quadro final da ficha'", () => {
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput="0.15"
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    expect(screen.getByRole("heading", { name: /quadro final da ficha/i })).toBeInTheDocument();
  });

  it("exibe Leitura Operacional Consolidada", () => {
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput="0.15"
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    expect(screen.getByText(/leitura operacional consolidada/i)).toBeInTheDocument();
  });

  it("exibe os cards Custos e CMV e Venda e Margem", () => {
    render(
      <TotaisIndicadores
        summary={buildSummary()}
        salePriceInput="87.90"
        variableExpensePercentInput="0.15"
        onSalePriceChange={vi.fn()}
        onVariableExpensePercentChange={vi.fn()}
      />
    );
    expect(screen.getByText(/custos e cmv/i)).toBeInTheDocument();
    expect(screen.getByText(/venda e margem/i)).toBeInTheDocument();
  });
});
