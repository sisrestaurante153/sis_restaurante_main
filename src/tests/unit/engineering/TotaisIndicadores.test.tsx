import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TotaisIndicadores } from "@/modules/engineering/ui/TotaisIndicadores";
import type { ComponentsEditorSummary } from "@/modules/engineering/ui/components-editor.types";

// Base summary: todos os campos validos. Cada teste sobrescreve apenas os relevantes.
const baseSummary: ComponentsEditorSummary = {
  totalGross: "1.0000",
  totalNet: "1.0000",
  postCookingWeight: "0.9000",
  cookingFactorGross: "1.0000",
  cookingFactorNet: "1.0000",
  totalInputCost: "16.5800",
  costWithoutPackagingPerKg: "18.4300",
  costWithPackagingPerKg: "20.2400",
  cmvPerKg: "20.2300",
  packagingCost: "1.8100",
  finalAppliedCmv: "20.2400",
  finalAppliedCmvLabel: "CMV final aplicado",
  cmvHealthStatus: "Saudavel",
  cmvHealthPercent: "0.35",
  cmvPercentOfSale: "0.35",
  salePrice: "45.00",
  referencePriceLabel: "Preco de Referencia",
  referencePrice: "45.00",
  variableExpensePercent: "0.10",
  variableExpensePercentLabel: "Despesa variavel de venda (%PV)",
  variableExpenseApplied: "4.5000",
  variableExpenseAppliedLabel: "Despesa variavel aplicada",
  contributionMarginValue: "20.2600",
  contributionMarginPercent: "0.45",
  operationalMarginContribution: "20.2600",
  operationalMarginContributionLabel: "Margem de Contribuicao",
  mealCmv: "--",
  packagingShareOnCmv: "--",
  costReal: "18.3900",
  preparationModePreview: "--",
  automaticDiagnosis: "--",
  automaticDiagnosisLabel: "Diagnostico automatico",
  assemblyEnabled: false
};

function renderTotais(summaryOverrides: Partial<ComponentsEditorSummary>, salePriceInput = "45.00") {
  const summary: ComponentsEditorSummary = { ...baseSummary, ...summaryOverrides };
  return render(
    <TotaisIndicadores
      summary={summary}
      salePriceInput={salePriceInput}
      variableExpensePercentInput="0.10"
      onSalePriceChange={() => {}}
      onVariableExpensePercentChange={() => {}}
    />
  );
}

describe("TotaisIndicadores — NaN guards (PDFV2-CRIT-03/05/06/07)", () => {
  it('CRIT-03: referencePrice null renderiza "--", nunca "R$ NaN"', () => {
    const { container } = renderTotais({ referencePrice: undefined });
    expect(container.textContent ?? "").not.toMatch(/R\$\s*NaN/);
    expect(container.textContent ?? "").not.toMatch(/NaN/);
  });

  it('CRIT-05: postCookingWeight "--" renderiza "Calcular peso" em CMV sem embalagem', () => {
    const { container } = renderTotais({
      postCookingWeight: "--",
      costWithoutPackagingPerKg: null,
      costWithPackagingPerKg: null,
      finalAppliedCmv: null
    });
    expect(container.textContent ?? "").toMatch(/Calcular peso/);
  });

  it('CRIT-05: postCookingWeight "" renderiza "Calcular peso" em CMV com Embalagem', () => {
    const { container } = renderTotais({
      postCookingWeight: "",
      costWithoutPackagingPerKg: null,
      costWithPackagingPerKg: null,
      finalAppliedCmv: null
    });
    expect(container.textContent ?? "").toMatch(/Calcular peso/);
  });

  it('CRIT-05: postCookingWeight nao finite ("abc") renderiza "Calcular peso" em CMV final aplicado', () => {
    const { container } = renderTotais({
      postCookingWeight: "abc",
      costWithoutPackagingPerKg: null,
      costWithPackagingPerKg: null,
      finalAppliedCmv: null
    });
    expect(container.textContent ?? "").toMatch(/Calcular peso/);
    // Nao deve aparecer NaN
    expect(container.textContent ?? "").not.toMatch(/NaN/);
  });

  it('CRIT-06: salePriceInput "" renderiza "Informe o valor" em Margem de contribuicao R$', () => {
    const { container } = renderTotais({ contributionMarginValue: undefined }, "");
    expect(container.textContent ?? "").toMatch(/Informe o valor/);
    expect(container.textContent ?? "").not.toMatch(/NaN/);
  });

  it('CRIT-06: salePriceInput "0" renderiza "Informe o valor"', () => {
    const { container } = renderTotais({ contributionMarginValue: undefined }, "0");
    expect(container.textContent ?? "").toMatch(/Informe o valor/);
    expect(container.textContent ?? "").not.toMatch(/NaN/);
  });

  it('CRIT-07: CMV da marmita (finalAppliedCmv) fallback "Calcular peso" quando peso final vazio', () => {
    // CRIT-07 e equivalente ao CRIT-05 finalAppliedCmv: divisao invalida quando postCookingWeight vazio.
    const { container } = renderTotais({
      postCookingWeight: "",
      finalAppliedCmv: null
    });
    expect(container.textContent ?? "").toMatch(/Calcular peso/);
  });

  it("guard global: nunca renderiza NaN/null/undefined com inputs invalidos", () => {
    const { container } = renderTotais(
      {
        postCookingWeight: "",
        costWithoutPackagingPerKg: null,
        costWithPackagingPerKg: null,
        finalAppliedCmv: null,
        referencePrice: undefined,
        contributionMarginValue: undefined,
        operationalMarginContribution: null,
        variableExpenseApplied: null,
        contributionMarginPercent: undefined,
        cmvPercentOfSale: null
      },
      ""
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/NaN/);
    expect(text).not.toMatch(/\bnull\b/);
    expect(text).not.toMatch(/\bundefined\b/);
  });
});
