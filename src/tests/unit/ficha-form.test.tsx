import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FichaForm } from "@/modules/engineering/ui/ficha-form";

const FICHA_FORM_SOURCE = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/engineering/ui/ficha-form.tsx"),
  "utf-8"
);

vi.mock("@/modules/engineering/server/engineering-actions", () => ({
  saveFichaAction: vi.fn(),
  EngineeringFormState: {}
}));

const itemOptions = [
  {
    id: "item-prato",
    name: "Prato Bife de Alcatra Acebolado",
    type: "prato",
    operationalCategory: "Montagem",
    usageUnit: "kg",
    currentCost: "20.8900",
    finalOutput: "0.7450"
  }
];

describe("FichaForm", () => {
  it("renders the ficha workflow in four semantic sections with totals and finalization fields", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={[
          { id: "mod-salao", label: "Salao" },
          { id: "mod-delivery", label: "Delivery" }
        ]}
        stageTypeOptions={[
          { id: "tipo-etapa-limpeza", code: "limpeza_pre_preparo", label: "Limpeza / Pre-Preparo" },
          { id: "tipo-etapa-coccao", code: "coccao_preparo", label: "Coccao / Preparo" },
          { id: "tipo-etapa-montagem", code: "montagem", label: "Montagem" }
        ]}
        initialValues={{
          id: "ficha-prato",
          itemId: "item-prato",
          itemName: "Prato Bife de Alcatra Acebolado",
          displayName: "Bife Acebolado Especial",
          itemType: "prato",
          groupOperational: "Montagem",
          yieldUnitCode: "kg",
          modality: {
            id: "mod-salao",
            label: "Salao"
          },
          status: "ativa",
          yieldMode: "peso_final",
          percentLoss: "0.0000",
          finalWeight: "0.7450",
          portions: "1.0000",
          preparationMode: "Montar o prato e finalizar para entrega.",
          notes: "Ficha validada com referencia da planilha.",
          createdAt: "2026-03-16T10:00:00.000Z",
          updatedAt: "2026-03-17T08:20:00.000Z",
          stages: [
            {
              id: "stage-1",
              name: "Montagem do Produto",
              outputQuantity: "0.7450",
              correctionFactor: "1.000000",
              cookingIndex: "1.000000",
              notes: "",
              items: []
            }
          ],
          summary: {
            totalGross: "0.7450",
            totalNet: "0.7450",
            postCookingWeight: "0.7450",
            cookingFactorGross: "1.0000",
            cookingFactorNet: "1.0000",
            totalInputCost: "15.4600",
            costWithoutPackagingPerKg: "20.7600",
            costWithPackagingPerKg: "20.8900",
            cmvPerKg: "20.8900",
            packagingCost: "0.1300",
            finalAppliedCmv: "20.8900",
            finalAppliedCmvLabel: "CMV final aplicado (c/ emb.)",
            cmvHealthStatus: "Saudavel",
            cmvHealthPercent: "0.2092",
            cmvPercentOfSale: "0.2092",
            salePrice: "87.9000",
            referencePriceLabel: "Preco de Referencia",
            referencePrice: "87.9000",
            variableExpensePercent: "0.1500",
            variableExpensePercentLabel: "Despesa variavel de venda (%PV)",
            variableExpenseApplied: "13.1850",
            variableExpenseAppliedLabel: "Despesa variavel aplicada",
            contributionMarginValue: "59.2550",
            contributionMarginPercent: "0.6741",
            operationalMarginContribution: "59.2550",
            operationalMarginContributionLabel: "Margem de Contribuicao",
            mealCmv: "0.2092",
            packagingShareOnCmv: "0.0083",
            costReal: "15.6000",
            preparationModePreview: "Montar o prato e finalizar para entrega.",
            automaticDiagnosis: "Diagnostico automatico: Saudavel. A ficha sustenta margem positiva dentro da faixa alvo.",
            automaticDiagnosisLabel: "Diagnostico automatico",
            assemblyEnabled: true
          }
        }}
      />
    );

    expect(screen.getByText("Identificacao")).toBeInTheDocument();
    expect(screen.getByText("Estrutura da ficha")).toBeInTheDocument();
    expect(screen.getByText("Quadro final da ficha")).toBeInTheDocument();
    expect(screen.getByText("Finalizacao")).toBeInTheDocument();
    expect(screen.getByLabelText(/produto/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bife Acebolado Especial")).toBeInTheDocument();
    expect(screen.getByLabelText(/modalidade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/grupo operacional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/custo atual da ficha/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Rendimento(\s+\*)?$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/unidade de rendimento/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Peso Final$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Fator de Correcao$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Indice de Coccao$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mod\. rendimento/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/% de coccao/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/indice de correcao/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fator de coccao/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ficha por etapas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar coccao final/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /adicionar itens/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/pesos e rendimento/i)).toBeInTheDocument();
    expect(screen.getByText(/custos e cmv/i)).toBeInTheDocument();
    expect(screen.getByText(/venda e margem/i)).toBeInTheDocument();
    expect(screen.getByText(/leitura operacional/i)).toBeInTheDocument();
    expect(screen.getByText(/cmv final aplicado/i)).toBeInTheDocument();
    expect(screen.getByText(/preco de referencia/i)).toBeInTheDocument();
    expect(screen.getByText(/^Diagnostico automatico$/i)).toBeInTheDocument();
    expect(screen.getByText("Saudavel")).toBeInTheDocument();
    expect(screen.getByLabelText("Preco de venda")).toBeInTheDocument();
    expect(screen.getByLabelText(/despesa variavel de venda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modo de preparo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observacoes da ficha/i)).toBeInTheDocument();
  }, 10000);

  it("renders commercial fallbacks instead of blank or NaN values when sale price or final weight are invalid", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={[{ id: "mod-salao", label: "Salao" }]}
        initialValues={{
          id: "ficha-prato",
          itemId: "item-prato",
          itemName: "Prato Bife de Alcatra Acebolado",
          displayName: "Bife Acebolado Especial",
          itemType: "prato",
          groupOperational: "Montagem",
          yieldUnitCode: "kg",
          modality: {
            id: "mod-salao",
            label: "Salao"
          },
          status: "ativa",
          yieldMode: "peso_final",
          percentLoss: "0.0000",
          finalWeight: null,
          portions: "1.0000",
          preparationMode: "Montar o prato e finalizar para entrega.",
          notes: "Fallbacks comerciais ativos.",
          createdAt: "2026-03-16T10:00:00.000Z",
          updatedAt: "2026-03-17T08:20:00.000Z",
          stages: [
            {
              id: "stage-1",
              name: "Montagem do Produto",
              outputQuantity: "",
              correctionFactor: "1.000000",
              cookingIndex: "1.000000",
              notes: "",
              items: []
            }
          ],
          summary: {
            totalGross: "0.7450",
            totalNet: "0.7450",
            postCookingWeight: "--",
            cookingFactorGross: null,
            cookingFactorNet: null,
            totalInputCost: "15.4600",
            costWithoutPackagingPerKg: "Calcular peso",
            costWithPackagingPerKg: "Calcular peso",
            cmvPerKg: "Calcular peso",
            packagingCost: "0.1300",
            finalAppliedCmv: "Calcular peso",
            finalAppliedCmvLabel: "CMV final aplicado",
            cmvHealthStatus: "Indefinido",
            cmvHealthPercent: "Informe o valor",
            cmvPercentOfSale: "Informe o valor",
            salePrice: "--",
            referencePriceLabel: "Preco de Referencia",
            referencePrice: "--",
            variableExpensePercent: "--",
            variableExpensePercentLabel: "Despesa variavel de venda (%PV)",
            variableExpenseApplied: "Informe o valor",
            variableExpenseAppliedLabel: "Despesa variavel aplicada",
            contributionMarginValue: "Informe o valor",
            contributionMarginPercent: "Informe o valor",
            operationalMarginContribution: "Informe o valor",
            operationalMarginContributionLabel: "Margem de Contribuicao",
            mealCmv: "Informe o valor",
            packagingShareOnCmv: "--",
            costReal: "15.6000",
            preparationModePreview: "Montar o prato e finalizar para entrega.",
            automaticDiagnosis: "Informe o preco de venda para calcular margem e CMV.",
            automaticDiagnosisLabel: "Diagnostico automatico",
            assemblyEnabled: false
          }
        }}
      />
    );

    expect(screen.getByText("Preco de Referencia")).toBeInTheDocument();
    expect(screen.getAllByText("Calcular peso").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Informe o valor").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
    expect(screen.queryByText("NaN %PV")).not.toBeInTheDocument();
  });
});

/**
 * Phase 09-03 (D-01..D-04): pixel-perfect Identificacao block.
 * Contrato HTML: update/tela-ficha-tecnica-v2.html linhas 60-61, 253-268.
 * Padrao Box sx CSS grid (Phase 8 D-09 / item-form.tsx:118-203).
 *
 * RED guard: source grep para literals (gridTemplateColumns, hex tokens) e
 * render asserts para labels exatos do HTML.
 */
const identificacaoMockInitial = {
  id: "ficha-ident-1",
  itemId: "item-prato",
  itemName: "Prato Bife de Alcatra Acebolado",
  displayName: "Bife Acebolado Especial",
  itemType: "prato",
  groupOperational: "Montagem",
  yieldUnitCode: "kg",
  modality: { id: "mod-salao", label: "Salao" },
  status: "ativa",
  yieldMode: "peso_final",
  percentLoss: "0.0000",
  finalWeight: "0.7450",
  portions: "1.0000",
  preparationMode: "",
  notes: "",
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-17T08:20:00.000Z",
  version: 1,
  stages: []
};

const identificacaoModalityOptions = [{ id: "mod-salao", label: "Salao" }];
const identificacaoStageTypeOptions = [
  { id: "tipo-etapa-coccao", code: "coccao_preparo", label: "Coccao / Preparo" }
];

function renderIdentificacao() {
  return render(
    <FichaForm
      itemOptions={itemOptions}
      modalityOptions={identificacaoModalityOptions}
      stageTypeOptions={identificacaoStageTypeOptions}
      initialValues={identificacaoMockInitial}
    />
  );
}

const MODALITY_OPTIONS = [
  { id: "mod-salao", label: "Salao" },
  { id: "mod-delivery", label: "Delivery" }
];
const STAGE_TYPE_OPTIONS = [
  { id: "tipo-etapa-limpeza", code: "limpeza_pre_preparo", label: "Limpeza / Pre-Preparo" },
  { id: "tipo-etapa-coccao", code: "coccao_preparo", label: "Coccao / Preparo" },
  { id: "tipo-etapa-montagem", code: "montagem", label: "Montagem" }
];

describe("FichaForm — registro (nova ficha)", () => {
  it("renderiza as quatro seções: Identificacao, Estrutura, Quadro final, Finalizacao", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={{
          itemId: "",
          itemName: "",
          itemType: "pre_preparo",
          groupOperational: "",
          modality: { id: "", label: "" },
          status: "ativa",
          yieldMode: "percentual_perda",
          percentLoss: "0.1000",
          finalWeight: "",
          portions: "1.0000",
          preparationMode: "",
          notes: ""
        }}
      />
    );
    expect(screen.getByText("Identificacao")).toBeInTheDocument();
    expect(screen.getByText("Estrutura da ficha")).toBeInTheDocument();
    expect(screen.getByText("Quadro final da ficha")).toBeInTheDocument();
    expect(screen.getByText("Finalizacao")).toBeInTheDocument();
  });

  it("gera código numérico de 6 dígitos automaticamente no campo Cod.", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={{
          itemId: "",
          itemName: "",
          itemType: "pre_preparo",
          groupOperational: "",
          modality: { id: "", label: "" },
          status: "ativa",
          yieldMode: "percentual_perda",
          percentLoss: "0.1000",
          finalWeight: "",
          portions: "1.0000",
          preparationMode: "",
          notes: ""
        }}
      />
    );
    const codInput = screen.getByLabelText(/^cod\.?\s*\*?$/i) as HTMLInputElement;
    expect(codInput.value).toMatch(/^\d{6}$/);
  });

  it("campo Produto começa vazio para nova ficha sem item vinculado", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={{
          itemId: "",
          itemName: "",
          itemType: "pre_preparo",
          groupOperational: "",
          modality: { id: "", label: "" },
          status: "ativa",
          yieldMode: "percentual_perda",
          percentLoss: "0.1000",
          finalWeight: "",
          portions: "1.0000",
          preparationMode: "",
          notes: ""
        }}
      />
    );
    const produtoInput = screen.getByLabelText(/produto/i) as HTMLInputElement;
    expect(produtoInput.value).toBe("");
  });

  it("Status padrão é 'ativa' (input hidden) na nova ficha", () => {
    const { container } = render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={{
          itemId: "",
          itemName: "",
          itemType: "pre_preparo",
          groupOperational: "",
          modality: { id: "", label: "" },
          status: "ativa",
          yieldMode: "percentual_perda",
          percentLoss: "0.1000",
          finalWeight: "",
          portions: "1.0000",
          preparationMode: "",
          notes: ""
        }}
      />
    );
    const hidden = container.querySelector('input[name="status"]') as HTMLInputElement;
    expect(hidden?.value).toBe("ativa");
  });

  it("renderiza o botão Adicionar Itens para começar a estrutura da ficha", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={{
          itemId: "",
          itemName: "",
          itemType: "pre_preparo",
          groupOperational: "",
          modality: { id: "", label: "" },
          status: "ativa",
          yieldMode: "percentual_perda",
          percentLoss: "0.1000",
          finalWeight: "",
          portions: "1.0000",
          preparationMode: "",
          notes: ""
        }}
      />
    );
    expect(screen.getAllByRole("button", { name: /adicionar itens/i }).length).toBeGreaterThan(0);
  });
});

describe("FichaForm — edição (ficha existente)", () => {
  const FICHA_EDIT = {
    id: "ficha-edit-1",
    code: "FT-099",
    itemId: "item-prato",
    itemName: "Prato Bife de Alcatra Acebolado",
    displayName: "Bife Acebolado Especial",
    itemType: "prato",
    groupOperational: "Montagem",
    yieldUnitCode: "kg",
    modality: { id: "mod-salao", label: "Salao" },
    status: "ativa",
    yieldMode: "peso_final",
    percentLoss: "0.0000",
    finalWeight: "0.7450",
    portions: "1.0000",
    preparationMode: "Montar e finalizar.",
    notes: "Obs da ficha existente.",
    createdAt: "2026-03-16T10:00:00.000Z",
    updatedAt: "2026-03-17T08:20:00.000Z",
    stages: []
  };

  it("campo Produto exibe o nome do produto vinculado", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={FICHA_EDIT}
      />
    );
    expect(screen.getByDisplayValue("Bife Acebolado Especial")).toBeInTheDocument();
  });

  it("campo Cod. exibe o código existente (não gera novo)", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={FICHA_EDIT}
      />
    );
    expect((screen.getByLabelText(/^cod\.?\s*\*?$/i) as HTMLInputElement).value).toBe("FT-099");
  });

  it("campo Grupo operacional exibe o grupo existente", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={FICHA_EDIT}
      />
    );
    expect((screen.getByLabelText(/grupo operacional/i) as HTMLInputElement).value).toBe("Montagem");
  });

  it("campo Modo de preparo exibe o texto existente", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={FICHA_EDIT}
      />
    );
    expect(screen.getByDisplayValue("Montar e finalizar.")).toBeInTheDocument();
  });

  it("campo Observacoes da ficha exibe o texto existente", () => {
    render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={FICHA_EDIT}
      />
    );
    expect(screen.getByDisplayValue("Obs da ficha existente.")).toBeInTheDocument();
  });

  it("Status 'ativa' é refletido no input hidden", () => {
    const { container } = render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={FICHA_EDIT}
      />
    );
    const hidden = container.querySelector('input[name="status"]') as HTMLInputElement;
    expect(hidden?.value).toBe("ativa");
  });

  it("Status 'inativa' é refletido no input hidden", () => {
    const { container } = render(
      <FichaForm
        itemOptions={itemOptions}
        modalityOptions={MODALITY_OPTIONS}
        stageTypeOptions={STAGE_TYPE_OPTIONS}
        initialValues={{ ...FICHA_EDIT, status: "inativa" }}
      />
    );
    const hidden = container.querySelector('input[name="status"]') as HTMLInputElement;
    expect(hidden?.value).toBe("inativa");
  });
});

describe("FichaForm Identificacao pixel-perfect (Phase 09-03)", () => {
  it("source contem gridTemplateColumns Row 1 '110px 1fr 150px 175px' (D-01)", () => {
    expect(FICHA_FORM_SOURCE).toContain("gridTemplateColumns: '110px 1fr 150px 175px'");
  });

  it("source contem gridTemplateColumns Row 2 '1fr 1fr 120px 1fr' (D-01)", () => {
    expect(FICHA_FORM_SOURCE).toContain("gridTemplateColumns: '1fr 1fr 120px 1fr'");
  });

  it("render mostra label 'Cod.' (D-01 label exato do HTML linha 257)", () => {
    renderIdentificacao();
    expect(screen.getByLabelText(/^cod\.?\s*\*?$/i)).toBeInTheDocument();
  });

  it.each([
    ["Produto", /produto/i],
    ["Data de criacao", /data de criacao/i],
    ["Data e hora da ultima alteracao", /data e hora da ultima alteracao/i],
    ["Modalidade", /modalidade/i],
    ["Grupo operacional", /grupo operacional/i],
    ["Status", /status/i]
  ])("render mostra label exato '%s' (D-01)", (_label, regex) => {
    renderIdentificacao();
    expect(screen.getByLabelText(regex)).toBeInTheDocument();
  });

  it("render mostra label 'Custo atual da ficha' (D-03)", () => {
    renderIdentificacao();
    // v5 align-residual: Custo atual virou TextField readOnly — label sai do Typography
    // e vai pra dentro do <label> flutuante MUI. getByLabelText encontra exatamente isso.
    expect(screen.getByLabelText(/custo atual da ficha/i)).toBeInTheDocument();
  });

  it("source contem token azul-l '#E6F1FB' no background do TextField custo atual (D-03)", () => {
    expect(FICHA_FORM_SOURCE).toContain("#E6F1FB");
  });

  it("source usa TextField readOnly para Custo atual alinhar com Modalidade/Grupo/Status (v5 align-residual)", () => {
    // Phase 09.2 v5 align-residual: cliente reclamou 2x que Custo atual da ficha estava
    // desalinhado. A solucao anterior (Box custom com height:40) ainda tinha 4-8px de
    // offset porque a label ficava ACIMA do box (Typography com mb:4), enquanto os
    // siblings usam label flutuante MUI que sobrepoe a borda top do input. Trocamos o
    // Box por TextField readOnly — mesmo componente, mesmas metricas, alinhamento
    // pixel-perfect garantido.
    expect(FICHA_FORM_SOURCE).toMatch(/label="Custo atual da ficha"/);
    expect(FICHA_FORM_SOURCE).toMatch(/readOnly:\s*true/);
  });

  it("source aplica cor azul (#185FA5) e fontWeight: 600 ao valor Custo atual (D-03)", () => {
    // D-03: HTML marca 600 em azul-escuro (#185FA5). Valor segue via slotProps.htmlInput.
    expect(FICHA_FORM_SOURCE).toMatch(/#185FA5/);
    expect(FICHA_FORM_SOURCE).toMatch(/fontWeight:\s*600/);
  });
});
