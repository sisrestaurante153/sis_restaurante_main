import type { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComponentsEditor } from "@/modules/engineering/ui/components-editor";

const itemOptions: ComponentProps<typeof ComponentsEditor>["itemOptions"] = [
  {
    id: "item-alcatra",
    name: "Bife acebolado",
    type: "produto_pronto",
    usageUnit: "kg",
    currentCost: "46.0237",
    finalOutput: "3.6000",
    operationalCategory: "Proteinas"
  },
  {
    id: "item-feijao",
    name: "Feijao cozido",
    type: "pre_preparo",
    usageUnit: "kg",
    currentCost: "5.7406",
    finalOutput: "1.0000",
    operationalCategory: "Guarnicoes"
  },
  {
    id: "item-marmitex",
    name: "Marmitex PRATO n 9 PRETO",
    type: "embalagem",
    usageUnit: "un",
    currentCost: "1.2941",
    finalOutput: "1.0000",
    operationalCategory: "Descartaveis"
  }
];

const stageTypeOptions: NonNullable<ComponentProps<typeof ComponentsEditor>["stageTypeOptions"]> = [
  {
    id: "tipo-etapa-limpeza",
    code: "limpeza_pre_preparo",
    label: "Limpeza / Pre-Preparo"
  },
  {
    id: "tipo-etapa-coccao",
    code: "coccao_preparo",
    label: "Coccao / Preparo"
  },
  {
    id: "tipo-etapa-montagem",
    code: "montagem",
    label: "Montagem"
  }
];

describe("ComponentsEditor (flat grid model)", () => {
  it("renders a single flat grid with per-row stage controls and footer buttons", () => {
    render(
      <ComponentsEditor
        itemOptions={itemOptions}
        stageTypeOptions={stageTypeOptions}
        initialStages={[
          {
            id: "stage-1",
            name: "Limpeza",
            stageTypeId: "tipo-etapa-limpeza",
            stageTypeCode: "limpeza_pre_preparo",
            stageTypeLabel: "Limpeza / Pre-Preparo",
            outputQuantity: "0.9000",
            correctionFactor: "1.000000",
            cookingIndex: "1.000000",
            notes: "",
            items: [
              {
                itemId: "item-alcatra",
                componentType: "ingrediente",
                quantityUsed: "0.4000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: ""
              }
            ]
          }
        ]}
        summary={{
          totalGross: "0.9000",
          totalNet: "0.9000",
          postCookingWeight: "0.9000",
          cookingFactorGross: "1.0000",
          cookingFactorNet: "1.0000",
          totalInputCost: "16.5800",
          costWithoutPackagingPerKg: "18.4300",
          cmvPerKg: "20.2300",
          packagingCost: "1.8100",
          salePrice: "--",
          variableExpensePercent: "--",
          contributionMarginValue: "--",
          contributionMarginPercent: "--",
          mealCmv: "--",
          packagingShareOnCmv: "--",
          costReal: "18.3900",
          preparationModePreview: "--"
        }}
      />
    );

    expect(screen.getByRole("tab", { name: /ficha tecnica/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /biblioteca de materiais/i })).toBeInTheDocument();
    expect(screen.getByText(/fluxo hibrido da ficha/i)).toBeInTheDocument();

    expect(screen.getByRole("columnheader", { name: /item \/ produto/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /etapa/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /custo insumo/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/peso limpo/i).length).toBeGreaterThanOrEqual(1);

    expect(screen.getByRole("button", { name: /adicionar itens/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar coccao final/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ativar montagem e descartaveis/i })).toBeInTheDocument();

    expect(screen.getByLabelText("Preco de venda")).toHaveValue("");
    expect(screen.getByLabelText("Despesa variavel de venda (%PV)")).toHaveValue("");
    expect(screen.getByText(/cmv final aplicado/i)).toBeInTheDocument();
    expect(screen.getAllByText(/margem de contribuicao/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/custo real/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /biblioteca de materiais/i }));

    expect(screen.getByLabelText(/buscar material/i)).toBeInTheDocument();
    expect(screen.getAllByText("Bife acebolado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Feijao cozido").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marmitex PRATO n 9 PRETO").length).toBeGreaterThan(0);
  });

  it("renders per-row peso labels driven by the row's stage type and reveals montagem on demand", () => {
    render(
      <ComponentsEditor
        itemOptions={itemOptions}
        stageTypeOptions={stageTypeOptions}
        initialStages={[
          {
            id: "stage-1",
            name: "Preparo",
            stageTypeId: "tipo-etapa-limpeza",
            stageTypeCode: "limpeza_pre_preparo",
            stageTypeLabel: "Limpeza / Pre-Preparo",
            outputQuantity: "0.4000",
            correctionFactor: "1.000000",
            cookingIndex: "1.000000",
            notes: "",
            items: [
              {
                itemId: "item-feijao",
                componentType: "ingrediente",
                quantityUsed: "0.3000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: ""
              }
            ]
          },
          {
            id: "stage-2",
            name: "Coccao",
            stageTypeId: "tipo-etapa-coccao",
            stageTypeCode: "coccao_preparo",
            stageTypeLabel: "Coccao / Preparo",
            outputQuantity: "1.0000",
            correctionFactor: "1.000000",
            cookingIndex: "1.200000",
            notes: "",
            items: [
              {
                itemId: "item-feijao",
                componentType: "ingrediente",
                quantityUsed: "1.0000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: ""
              }
            ]
          }
        ]}
        summary={{
          totalGross: "0.0000",
          totalNet: "0.0000",
          postCookingWeight: "0.0000",
          cookingFactorGross: null,
          cookingFactorNet: null,
          totalInputCost: "0.0000",
          costWithoutPackagingPerKg: null,
          cmvPerKg: "0.0000",
          packagingCost: "0.0000",
          salePrice: "--",
          variableExpensePercent: "--",
          contributionMarginValue: "--",
          contributionMarginPercent: "--",
          mealCmv: "--",
          packagingShareOnCmv: "--",
          costReal: "0.0000",
          preparationModePreview: "--"
        }}
      />
    );

    expect(screen.getAllByLabelText(/peso limpo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/peso pos-coccao/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Montagem e Descartaveis" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ativar montagem e descartaveis/i }));

    expect(screen.getByRole("heading", { name: "Montagem e Descartaveis" })).toBeInTheDocument();
  });

  it("adds library items into the flat grid and groups them back into stages on serialize", () => {
    render(
      <ComponentsEditor
        itemOptions={itemOptions}
        stageTypeOptions={stageTypeOptions}
        summary={{
          totalGross: "0.0000",
          totalNet: "0.0000",
          postCookingWeight: "0.0000",
          cookingFactorGross: null,
          cookingFactorNet: null,
          totalInputCost: "0.0000",
          costWithoutPackagingPerKg: null,
          cmvPerKg: "0.0000",
          packagingCost: "0.0000",
          salePrice: "--",
          variableExpensePercent: "--",
          contributionMarginValue: "--",
          contributionMarginPercent: "--",
          mealCmv: "--",
          packagingShareOnCmv: "--",
          costReal: "0.0000",
          preparationModePreview: "--"
        }}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /biblioteca de materiais/i }));

    const packagingCard = screen.getByText("Marmitex PRATO n 9 PRETO").closest(".MuiCard-root");
    expect(packagingCard).not.toBeNull();

    fireEvent.click(within(packagingCard as HTMLElement).getByRole("button", { name: /adicionar/i }));

    expect(screen.getByRole("tab", { name: /ficha tecnica/i })).toHaveAttribute("aria-selected", "true");
    expect(document.querySelector('input[name="stagesJson"]')).toHaveAttribute(
      "value",
      expect.stringContaining('"itemId":"item-marmitex"')
    );
    expect(document.querySelector('input[name="componentsJson"]')).toHaveAttribute(
      "value",
      expect.stringContaining('"itemId":"item-marmitex"')
    );
  });

  // Quick 20260421 T3: auto-calculo do Rendimento da Porcao sem Coccao Final.
  // Regra por componente:
  //   - stageTypeCode = "limpeza_pre_preparo" -> usa outputWeight (peso limpo)
  //   - caso contrario                        -> outputWeight se > 0, senao quantityUsed
  it("auto-calcula Rendimento da Porcao somando por componente quando nao ha Coccao Final (T3)", () => {
    render(
      <ComponentsEditor
        itemOptions={itemOptions}
        stageTypeOptions={stageTypeOptions}
        initialStages={[
          {
            id: "stage-1",
            name: "Limpeza",
            stageTypeId: "tipo-etapa-limpeza",
            stageTypeCode: "limpeza_pre_preparo",
            stageTypeLabel: "Limpeza / Pre-Preparo",
            // outputQuantity agregado da etapa = 0.3000; itens ganham outputWeight
            // proporcional via flattenStagesToRows. Com 1 item de 0.4 (quantityUsed),
            // a proporcao e 1.0 -> outputWeight = 0.3000.
            outputQuantity: "0.3000",
            correctionFactor: "0.750000",
            cookingIndex: "",
            notes: "",
            items: [
              {
                itemId: "item-alcatra",
                componentType: "ingrediente",
                quantityUsed: "0.4000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: ""
              }
            ]
          },
          {
            // 2a etapa NAO e coccao_final; nao ha outputQuantity -> item cai no
            // fallback quantityUsed (0.5000).
            id: "stage-2",
            name: "Preparo manual",
            stageTypeId: "tipo-etapa-coccao",
            stageTypeCode: "coccao_preparo",
            stageTypeLabel: "Coccao / Preparo",
            outputQuantity: "",
            correctionFactor: "",
            cookingIndex: "",
            notes: "",
            items: [
              {
                itemId: "item-feijao",
                componentType: "ingrediente",
                quantityUsed: "0.5000",
                usageUnit: "kg",
                levelLabel: "N2",
                notes: ""
              }
            ]
          }
        ]}
      />
    );

    // Rendimento da Porcao esperado: 0.3000 (limpeza outputWeight) + 0.5000
    // (coccao fallback para quantityUsed) = 0.8000
    const rendimentoCell = screen.getByText("Rendimento da Porcao").closest("div");
    expect(rendimentoCell).not.toBeNull();
    // A celula da Rendimento deve exibir 0.8000 ao inves de "--".
    expect(within(rendimentoCell as HTMLElement).getByText("0.8000")).toBeInTheDocument();
  });
});
