"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Fade from "@mui/material/Fade";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { FormSection } from "@/components/ui/FormSection";
import { BibliotecaMateriais } from "@/modules/engineering/ui/BibliotecaMateriais";
import { FichaFlatGrid } from "@/modules/engineering/ui/FichaFlatGrid";
import { IngredienteDataGrid } from "@/modules/engineering/ui/IngredienteDataGrid";
import { TotaisIndicadores } from "@/modules/engineering/ui/TotaisIndicadores";
import {
  COCCAO_FINAL_CODE,
  MONTAGEM_CODE,
  flattenStagesToRows,
  groupRowsToStages,
  isAssemblyStageLike
} from "@/modules/engineering/ui/ficha-flat-rows";
import type {
  ComponentEditorRow,
  ComponentOption,
  ComponentsEditorSummary,
  FichaStageEditor,
  StageTypeOption
} from "@/modules/engineering/ui/components-editor.types";

export type { ComponentEditorRow, ComponentsEditorSummary };

// Phase 09.2 B3: shape publicado via onQuadroFinalChange para que ficha-form
// renderize TotaisIndicadores fora do ComponentsEditor (apos Finalizacao).
export interface QuadroFinalState {
  summary: ComponentsEditorSummary;
  salePriceInput: string;
  variableExpensePercentInput: string;
  assemblyEnabled: boolean;
}

interface ComponentsEditorProps {
  itemOptions: ComponentOption[];
  stageTypeOptions?: StageTypeOption[];
  // Quick 20260424 item 3: opcoes de unidade vindas de master-data listUnits().
  unitOptions?: string[];
  initialStages?: FichaStageEditor[];
  summary?: ComponentsEditorSummary;
  errors?: Record<string, string[] | undefined>;
  // Ajuste 1/2: quando true, linhas sem item selecionado ficam vermelhas e a
  // grade rola até a primeira inválida.
  showRowErrors?: boolean;
  // Phase 09.2 B3: quando presente, esconde TotaisIndicadores interno e publica
  // props via callback para renderizacao controlada no ficha-form.
  hideQuadroFinal?: boolean;
  onQuadroFinalChange?: (state: QuadroFinalState) => void;
  // Phase 09.2 B3: controladores externos (TotaisIndicadores renderizado por
  // ficha-form dispara estes callbacks).
  salePriceInput?: string;
  variableExpensePercentInput?: string;
  assemblyEnabled?: boolean;
  onSalePriceChange?: (value: string) => void;
  onVariableExpensePercentChange?: (value: string) => void;
  onAssemblyEnabledChange?: (value: boolean) => void;
}

const UNIT_FACTORS: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  l: 1,
  ml: 0.001,
  un: 1,
  unidade: 1,
  maco: 1,
  "maÃƒÂ§o": 1
};

const DEBUG_FICHA =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_FICHA_DEBUG === "1";

function normalizeQuantity(quantity: string, unitCode: string) {
  const factor = UNIT_FACTORS[unitCode.trim().toLowerCase()] ?? 1;
  return Number(quantity || "0") * factor;
}

function inferComponentType(itemType?: string): ComponentEditorRow["componentType"] {
  if (itemType === "embalagem") return "embalagem";
  if (itemType === "apoio") return "apoio";
  return "ingrediente";
}

function buildRowFromOption(
  itemOptions: ComponentOption[],
  option?: ComponentOption,
  level = 1
): ComponentEditorRow {
  return {
    itemId: option?.id ?? "",
    componentType: inferComponentType(option?.type),
    quantityUsed: "1.0000",
    usageUnit: option?.usageUnit ?? "kg",
    levelLabel: `N${level}`,
    notes: ""
  };
}

function buildCoccaoFinalRow(
  itemOptions: ComponentOption[],
  stageTypeOptions: StageTypeOption[],
  level: number
): ComponentEditorRow {
  const coccaoType = stageTypeOptions.find((option) => option.code === COCCAO_FINAL_CODE);

  return {
    itemId: "",
    componentType: "ingrediente",
    quantityUsed: "1.0000",
    usageUnit: "kg",
    levelLabel: `N${level}`,
    notes: "",
    stageTypeId: coccaoType?.id,
    stageTypeCode: coccaoType?.code ?? COCCAO_FINAL_CODE,
    stageTypeLabel: coccaoType?.label ?? "Coccao / Preparo",
    outputWeight: "",
    isCoccaoFinal: true
  };
}

function calculateSubtotal(row: ComponentEditorRow, itemOptions: ComponentOption[]) {
  const option = itemOptions.find((item) => item.id === row.itemId);
  return (Number(option?.currentCost ?? "0") || 0) * Number(row.quantityUsed || "0");
}

function parseOptionalDecimal(value?: string | null) {
  if (!value || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePercentInput(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return value > 1 ? value / 100 : value;
}

function resolveCmvHealthStatus(cmvRatio: number | null) {
  if (cmvRatio === null || !Number.isFinite(cmvRatio)) return "Indefinido" as const;
  const percent = cmvRatio * 100;
  if (percent < 30) return "Excelente" as const;
  if (percent < 35) return "Saudavel" as const;
  if (percent < 40) return "Atencao" as const;
  return "Critico" as const;
}

function resolveAutomaticDiagnosis(input: {
  hasSalePrice: boolean;
  contributionMarginValue: number | null;
  cmvRatio: number | null;
}) {
  if (!input.hasSalePrice) {
    return "Informe o preco de venda para calcular margem e CMV.";
  }

  if (input.contributionMarginValue === null || input.cmvRatio === null) {
    return "Diagnostico automatico indisponivel: faltam dados validos para simular a ficha.";
  }

  if (input.contributionMarginValue <= 0 || input.cmvRatio >= 0.4) {
    return "Diagnostico automatico: Critico. O custo final e as despesas consomem a venda projetada.";
  }

  if (input.cmvRatio >= 0.35) {
    return "Diagnostico automatico: Atencao. Revisar precos ou insumos para recuperar margem.";
  }

  if (input.cmvRatio >= 0.3) {
    return "Diagnostico automatico: Saudavel. Operacao eficiente dentro da faixa aceitavel.";
  }

  return "Diagnostico automatico: Excelente. Margem alta — ficha bem precificada.";
}

function computeStageMetrics(stage: FichaStageEditor, itemOptions: ComponentOption[]) {
  const inputQuantity = stage.items.reduce(
    (sum, item) => sum + normalizeQuantity(item.quantityUsed, item.usageUnit),
    0
  );
  const outputQuantity = Number(stage.outputQuantity || "0");
  const totalCost = stage.items.reduce((sum, item) => sum + calculateSubtotal(item, itemOptions), 0);
  const stageTypeCode = stage.stageTypeCode;

  const correctionFactor =
    stageTypeCode === "limpeza_pre_preparo" && inputQuantity > 0 && outputQuantity > 0
      ? (outputQuantity / inputQuantity).toFixed(6)
      : "";
  const cookingIndex =
    stageTypeCode === "coccao_preparo" && inputQuantity > 0 && outputQuantity > 0
      ? (outputQuantity / inputQuantity).toFixed(6)
      : "";

  return { inputQuantity, outputQuantity, totalCost, correctionFactor, cookingIndex };
}

export function ComponentsEditor({
  itemOptions,
  stageTypeOptions = [],
  unitOptions,
  initialStages = [],
  summary,
  errors,
  showRowErrors,
  hideQuadroFinal = false,
  onQuadroFinalChange,
  salePriceInput: controlledSalePriceInput,
  variableExpensePercentInput: controlledVariableExpensePercentInput,
  assemblyEnabled: controlledAssemblyEnabled,
  onSalePriceChange,
  onVariableExpensePercentChange,
  onAssemblyEnabledChange
}: ComponentsEditorProps) {
  const initialAssemblyStage = initialStages.find((stage) => isAssemblyStageLike(stage, stageTypeOptions));
  const initialRegularStages = initialStages.filter((stage) => !isAssemblyStageLike(stage, stageTypeOptions));

  const [activeTab, setActiveTab] = useState<"ficha" | "biblioteca">("ficha");
  const [flatRows, setFlatRows] = useState<ComponentEditorRow[]>(() =>
    flattenStagesToRows(initialRegularStages, stageTypeOptions)
  );
  const [internalAssemblyEnabled, setInternalAssemblyEnabled] = useState(
    Boolean(initialAssemblyStage) || (summary?.assemblyEnabled ?? false)
  );
  const [assemblyRows, setAssemblyRows] = useState<ComponentEditorRow[]>(initialAssemblyStage?.items ?? []);
  const [internalSalePriceInput, setInternalSalePriceInput] = useState(
    summary?.salePrice && summary.salePrice !== "--" ? summary.salePrice : ""
  );
  const [internalVariableExpensePercentInput, setInternalVariableExpensePercentInput] = useState(
    summary?.variableExpensePercent && summary.variableExpensePercent !== "--"
      ? summary.variableExpensePercent
      : ""
  );

  // Phase 09.2 B3: usa valor controlado do ficha-form quando disponivel; fallback interno.
  const salePriceInput = controlledSalePriceInput ?? internalSalePriceInput;
  const variableExpensePercentInput =
    controlledVariableExpensePercentInput ?? internalVariableExpensePercentInput;
  const assemblyEnabled = controlledAssemblyEnabled ?? internalAssemblyEnabled;

  const setSalePriceInput = (value: string) => {
    if (onSalePriceChange) onSalePriceChange(value);
    else setInternalSalePriceInput(value);
  };
  const setVariableExpensePercentInput = (value: string) => {
    if (onVariableExpensePercentChange) onVariableExpensePercentChange(value);
    else setInternalVariableExpensePercentInput(value);
  };
  const setAssemblyEnabled = (valueOrUpdater: boolean | ((current: boolean) => boolean)) => {
    const nextValue =
      typeof valueOrUpdater === "function" ? valueOrUpdater(assemblyEnabled) : valueOrUpdater;
    if (onAssemblyEnabledChange) onAssemblyEnabledChange(nextValue);
    else setInternalAssemblyEnabled(nextValue);
  };

  const deferredFlatRows = useDeferredValue(flatRows);
  const hasCoccaoFinal = flatRows.some((row) => row.isCoccaoFinal);

  const serializedRegularStages = useMemo(() => {
    // Ajuste 2: remover silenciosamente linhas sem item E com qtde zerada/vazia
    // antes de serializar. Linhas sem item mas com qtde > 0 permanecem e geram
    // erro no servidor (visualmente destacadas pelo showRowErrors).
    const rowsForSerialization = deferredFlatRows.filter(
      (row) => row.isCoccaoFinal || row.itemId || Number(row.quantityUsed || "0") > 0
    );
    const { stages } = groupRowsToStages(rowsForSerialization, stageTypeOptions);
    return stages.map((stage) => {
      const metrics = computeStageMetrics(stage, itemOptions);
      return {
        ...stage,
        correctionFactor: metrics.correctionFactor,
        cookingIndex: metrics.cookingIndex
      };
    });
  }, [deferredFlatRows, itemOptions, stageTypeOptions]);

  const serializedStagesValue = useMemo(() => {
    const payload: FichaStageEditor[] = [...serializedRegularStages];

    // Ajuste 4: só inclui a etapa de montagem se tiver pelo menos um item.
    // Montagem vazia = toggle ligado sem adicionar itens → salva normalmente
    // como se o toggle estivesse desligado.
    if (assemblyEnabled && assemblyRows.length > 0) {
      const montagem = stageTypeOptions.find((option) => option.code === MONTAGEM_CODE);
      payload.push({
        id: "assembly-stage",
        name: "Montagem e Descartaveis",
        stageTypeId: montagem?.id,
        stageTypeCode: montagem?.code ?? MONTAGEM_CODE,
        stageTypeLabel: montagem?.label ?? "Montagem",
        outputQuantity: "",
        correctionFactor: "",
        cookingIndex: "",
        notes: "",
        items: assemblyRows
      });
    }

    return payload;
  }, [assemblyEnabled, assemblyRows, serializedRegularStages, stageTypeOptions]);

  if (DEBUG_FICHA) {
    console.debug("[FichaEditor] flatRows -> stages", {
      flatRows: deferredFlatRows,
      stages: serializedStagesValue
    });
  }

  const serializedStages = JSON.stringify(serializedStagesValue);
  const serializedComponents = JSON.stringify(
    serializedStagesValue.flatMap((stage) =>
      stage.items.map((item) => ({
        itemId: item.itemId,
        componentType: item.componentType,
        quantityUsed: item.quantityUsed,
        quantityGross: item.quantityUsed,
        quantityNet: item.quantityUsed,
        usageUnit: item.usageUnit,
        notes: item.notes ?? ""
      }))
    )
  );

  const regularItems = serializedRegularStages.flatMap((stage) => stage.items);
  const assemblyCost = assemblyEnabled
    ? assemblyRows.reduce((sum, row) => sum + calculateSubtotal(row, itemOptions), 0)
    : 0;
  const ingredientsCost = regularItems.reduce((sum, row) => sum + calculateSubtotal(row, itemOptions), 0);
  const totalQuantity = regularItems.reduce(
    (sum, row) => sum + normalizeQuantity(row.quantityUsed, row.usageUnit),
    0
  );

  // Quick 20260421 T3: auto-calculo do Rendimento da Porcao quando o botao
  // "Adicionar Coccao Final" NAO foi pressionado (fluxo tipico: usuario que
  // nao acionou a etapa final e espera ver um rendimento logico na UI).
  //
  // Regra (por componente):
  //   - stage = limpeza_pre_preparo -> usa outputWeight (peso limpo)
  //   - caso contrario              -> outputWeight se > 0, senao quantityUsed
  //
  // Quando existe coccaoFinal (hasCoccaoFinal=true) mantemos o comportamento
  // antigo: output agregado da etapa final e a fonte canonica do rendimento.
  const coccaoFinalStage = serializedRegularStages.find(
    (stage) => stage.name === "Coccao / Preparo Final"
  );
  const lastCoccaoStage =
    coccaoFinalStage ??
    [...serializedRegularStages].reverse().find((stage) => stage.stageTypeCode === COCCAO_FINAL_CODE);

  function computeRendimentoSemCoccaoFinal() {
    // Soma por componente com a regra acima, usando flatRows que preservam
    // outputWeight e stageTypeCode por linha (stripFlatMetadata remove esses
    // campos em serializedRegularStages).
    let total = 0;
    for (const row of deferredFlatRows) {
      if (row.isCoccaoFinal) continue;
      const outputWeight = Number(row.outputWeight || "0") || 0;
      const quantityUsed = Number(row.quantityUsed || "0") || 0;
      if (row.stageTypeCode === "limpeza_pre_preparo") {
        total += outputWeight;
      } else {
        total += outputWeight > 0 ? outputWeight : quantityUsed;
      }
    }
    return total;
  }

  const rendimentoAutoNumber = hasCoccaoFinal ? 0 : computeRendimentoSemCoccaoFinal();
  const rendimentoAuto = !hasCoccaoFinal && rendimentoAutoNumber > 0
    ? rendimentoAutoNumber.toFixed(4)
    : "";

  const derivedPostCookingWeight =
    lastCoccaoStage?.outputQuantity ||
    serializedRegularStages[serializedRegularStages.length - 1]?.outputQuantity ||
    rendimentoAuto ||
    summary?.postCookingWeight ||
    "--";

  const postCookingWeightNumber = parseOptionalDecimal(derivedPostCookingWeight);
  const salePriceNumber = parseOptionalDecimal(salePriceInput);
  const variableExpensePercentNumber = normalizePercentInput(parseOptionalDecimal(variableExpensePercentInput));
  const hasUsablePostCookingWeight = postCookingWeightNumber !== null && postCookingWeightNumber > 0;
  const hasUsableSalePrice = salePriceNumber !== null && salePriceNumber > 0;
  const dynamicCostReal = ingredientsCost + assemblyCost;
  const dynamicCostWithoutPackagingPerKg = hasUsablePostCookingWeight
    ? (ingredientsCost / postCookingWeightNumber).toFixed(4)
    : "Calcular peso";
  const dynamicCostWithPackagingPerKg = hasUsablePostCookingWeight
    ? (dynamicCostReal / postCookingWeightNumber).toFixed(4)
    : "Calcular peso";
  // Ajuste 4: montagem vazia (toggle on, sem itens) → trata como desligada
  const effectiveAssemblyEnabled = assemblyEnabled && assemblyRows.length > 0;
  const finalAppliedCmv = effectiveAssemblyEnabled ? dynamicCostWithPackagingPerKg : dynamicCostWithoutPackagingPerKg;
  const costForMarginCalc = hasUsablePostCookingWeight ? Number(finalAppliedCmv) : dynamicCostReal;
  const variableExpenseValue =
    salePriceNumber !== null && variableExpensePercentNumber !== null
      ? salePriceNumber * variableExpensePercentNumber
      : null;
  const contributionMarginValue =
    salePriceNumber !== null && variableExpenseValue !== null
      ? salePriceNumber - costForMarginCalc - variableExpenseValue
      : null;
  const contributionMarginPercent =
    hasUsableSalePrice && contributionMarginValue !== null
      ? (contributionMarginValue / salePriceNumber).toFixed(4)
      : hasUsableSalePrice
        ? "--"
        : "Informe o valor";
  const mealCmv = hasUsableSalePrice
    ? (dynamicCostReal / salePriceNumber).toFixed(4)
    : "Informe o valor";
  const packagingShareOnCmv = dynamicCostReal > 0 ? (assemblyCost / dynamicCostReal).toFixed(4) : "0.0000";
  // Quando há peso pós-cocção, o preço de venda é por kg e o custo relevante
  // é o custo/kg (mesma base usada pela margem). Sem peso, usa custo total.
  const cmvRatioForHealth =
    hasUsableSalePrice
      ? hasUsablePostCookingWeight
        ? costForMarginCalc / salePriceNumber
        : (assemblyEnabled ? dynamicCostReal : ingredientsCost) / salePriceNumber
      : null;
  const cmvPercentOfSale = hasUsableSalePrice
    ? (cmvRatioForHealth ?? 0).toFixed(4)
    : "Informe o valor";
  const cmvHealthStatus = resolveCmvHealthStatus(cmvRatioForHealth);
  const automaticDiagnosis = resolveAutomaticDiagnosis({
    hasSalePrice: hasUsableSalePrice,
    contributionMarginValue,
    cmvRatio: cmvRatioForHealth
  });

  const resolvedSummary: ComponentsEditorSummary = {
    totalGross: totalQuantity.toFixed(4),
    totalNet: totalQuantity.toFixed(4),
    postCookingWeight: derivedPostCookingWeight,
    cookingFactorGross: serializedRegularStages.find((stage) => stage.correctionFactor)?.correctionFactor ?? null,
    cookingFactorNet: serializedRegularStages.find((stage) => stage.cookingIndex)?.cookingIndex ?? null,
    totalInputCost: ingredientsCost.toFixed(4),
    costWithoutPackagingPerKg: dynamicCostWithoutPackagingPerKg,
    costWithPackagingPerKg: dynamicCostWithPackagingPerKg,
    cmvPerKg: dynamicCostWithPackagingPerKg,
    packagingCost: assemblyCost.toFixed(4),
    finalAppliedCmv,
    finalAppliedCmvLabel: assemblyEnabled ? "CMV final aplicado (c/ emb.)" : "CMV final aplicado",
    cmvHealthStatus,
    cmvHealthPercent: cmvPercentOfSale,
    cmvPercentOfSale,
    salePrice: salePriceInput || "--",
    referencePriceLabel: "Preco de Referencia",
    // PDFV2-CRIT-03: sanitizar referencePrice para nunca renderizar "R$ NaN"/"null"/"undefined".
    // Se salePriceNumber e valido (> 0), exporta valor formatado; caso contrario, passa null
    // (formatCurrency em TotaisIndicadores cai no fallback "--").
    referencePrice: hasUsableSalePrice ? salePriceNumber.toFixed(4) : undefined,
    variableExpensePercent: variableExpensePercentInput || "--",
    variableExpensePercentLabel: "Despesa variavel de venda (%PV)",
    variableExpenseApplied:
      variableExpenseValue === null
        ? hasUsableSalePrice
          ? "--"
          : "Informe o valor"
        : variableExpenseValue.toFixed(4),
    variableExpenseAppliedLabel: "Despesa variavel aplicada",
    contributionMarginValue:
      contributionMarginValue === null
        ? hasUsableSalePrice
          ? "--"
          : "Informe o valor"
        : contributionMarginValue.toFixed(4),
    contributionMarginPercent,
    operationalMarginContribution:
      contributionMarginValue === null
        ? hasUsableSalePrice
          ? "--"
          : "Informe o valor"
        : contributionMarginValue.toFixed(4),
    operationalMarginContributionLabel: "Margem de Contribuicao",
    mealCmv,
    packagingShareOnCmv,
    costReal: dynamicCostReal.toFixed(4),
    preparationModePreview: summary?.preparationModePreview ?? "--",
    automaticDiagnosis,
    automaticDiagnosisLabel: "Diagnostico automatico",
    assemblyEnabled
  };

  // Quick 20260424 fase2 #2: detectar ids duplicados (qualquer item que aparece
  // 2x ou mais entre flatRows + assemblyRows). FichaFlatGrid renderiza um icone
  // de alerta com Tooltip nas linhas afetadas — sem Alert top-level que poluia
  // a tela.
  const duplicateItemIds = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of [...flatRows, ...(assemblyEnabled ? assemblyRows : [])]) {
      if (!item.itemId) continue;
      counts.set(item.itemId, (counts.get(item.itemId) ?? 0) + 1);
    }

    return new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([itemId]) => itemId)
    );
  }, [assemblyEnabled, assemblyRows, flatRows]);

  function updateFlatRow(index: number, patch: Partial<ComponentEditorRow>) {
    setFlatRows((current) => current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  }

  function removeFlatRow(index: number) {
    setFlatRows((current) => current.filter((_, idx) => idx !== index));
  }

  function reorderFlatRows(from: number, to: number) {
    setFlatRows((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addFlatRow(option?: ComponentOption) {
    setFlatRows((current) => [...current, buildRowFromOption(itemOptions, option, current.length + 1)]);
  }

  function addCoccaoFinalRow() {
    setFlatRows((current) => [
      ...current,
      buildCoccaoFinalRow(itemOptions, stageTypeOptions, current.length + 1)
    ]);
  }

  function updateAssemblyRow(rowIndex: number, patch: Partial<ComponentEditorRow>) {
    setAssemblyRows((current) => current.map((item, index) => (index === rowIndex ? { ...item, ...patch } : item)));
  }

  function removeAssemblyRow(rowIndex: number) {
    setAssemblyRows((current) => current.filter((_, index) => index !== rowIndex));
  }

  function reorderAssemblyRow(from: number, to: number) {
    setAssemblyRows((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addAssemblyRow(option?: ComponentOption) {
    setAssemblyRows((current) => [...current, buildRowFromOption(itemOptions, option, current.length + 1)]);
  }

  function addLibraryItem(option: ComponentOption) {
    addFlatRow(option);
    setActiveTab("ficha");
  }

  return (
    <>
      <input type="hidden" name="stagesJson" value={serializedStages} />
      <input type="hidden" name="componentsJson" value={serializedComponents} />

      <FormSection title="Estrutura da ficha">
        <Stack spacing={3}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} aria-label="Estrutura da ficha">
            <Tab value="ficha" label="Ficha tecnica" />
            <Tab value="biblioteca" label="Biblioteca de materiais" />
          </Tabs>

          <Fade in={activeTab === "ficha"} mountOnEnter unmountOnExit>
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Fluxo hibrido da ficha
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ficha por etapas (linha a linha)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adicione ingredientes linha a linha, escolha o tipo de etapa inline e deixe FC/IC
                    reagirem aos pesos finais por linha.
                  </Typography>
                </Box>
              </Stack>

              <Card variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <FichaFlatGrid
                    rows={flatRows}
                    itemOptions={itemOptions}
                    stageTypeOptions={stageTypeOptions}
                    unitOptions={unitOptions}
                    duplicateItemIds={duplicateItemIds}
                    showRowErrors={showRowErrors}
                    onUpdateRow={updateFlatRow}
                    onRemoveRow={removeFlatRow}
                    onReorderRows={reorderFlatRows}
                    onAddRow={() => addFlatRow()}
                    onAddCoccaoFinal={addCoccaoFinalRow}
                    hasCoccaoFinal={hasCoccaoFinal}
                  />
                </CardContent>
              </Card>

              <Stack spacing={1.5}>
                {assemblyEnabled ? (
                  <Card
                    variant="outlined"
                    sx={{ borderColor: "#C0DD97", bgcolor: "#EAF3DE" }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={2.5}>
                        {/* Phase 09.2 B2: botao removido do header; movido para o rodape (padrao A1). */}
                        <Box>
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            component="h2"
                            sx={{ color: "#1B6B2C", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}
                          >
                            Montagem e Descartaveis
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#1B6B2C", fontSize: 11 }}>
                            Custos entram apenas no CMV com embalagem.
                          </Typography>
                        </Box>

                        <IngredienteDataGrid
                          rows={assemblyRows.map((row, index) => ({ row, index }))}
                          itemOptions={itemOptions}
                          onUpdateRow={updateAssemblyRow}
                          onRemoveRow={removeAssemblyRow}
                          onReorderRows={reorderAssemblyRow}
                          costHeaderLabel="Custo insumo"
                        />

                        {/* Phase 09.2 B2: "+ Adicionar itens" no rodape (padrao consistente com A1). */}
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                          <Button type="button" variant="contained" startIcon={<AddIcon />} onClick={() => addAssemblyRow()}>
                            Adicionar itens
                          </Button>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ) : null}

                <Button
                  type="button"
                  variant={assemblyEnabled ? "text" : "outlined"}
                  onClick={() => setAssemblyEnabled((current) => !current)}
                  sx={{ alignSelf: "stretch" }}
                >
                  {assemblyEnabled ? "Ocultar Montagem e Descartaveis" : "Ativar Montagem e Descartaveis"}
                </Button>
              </Stack>
            </Stack>
          </Fade>

          <Fade in={activeTab === "biblioteca"} mountOnEnter unmountOnExit>
            <div>
              <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Os materiais adicionados entram diretamente na grade da ficha.
                </Typography>
              </Stack>
              <BibliotecaMateriais itemOptions={itemOptions} onAddItem={addLibraryItem} />
            </div>
          </Fade>

          {errors?.stagesJson?.[0] ? (
            <Typography variant="body2" color="error.main">
              {errors.stagesJson[0]}
            </Typography>
          ) : null}
        </Stack>
      </FormSection>

      {/* Phase 09.2 B3: publish quadro final state so ficha-form can render
          TotaisIndicadores apos Finalizacao. Renderizado dentro do efeito
          via <QuadroFinalPublisher/>. */}
      {onQuadroFinalChange ? (
        <QuadroFinalPublisher
          state={{
            summary: resolvedSummary,
            salePriceInput,
            variableExpensePercentInput,
            assemblyEnabled
          }}
          onChange={onQuadroFinalChange}
        />
      ) : null}

      {hideQuadroFinal ? null : (
        <TotaisIndicadores
          summary={resolvedSummary}
          salePriceInput={salePriceInput}
          variableExpensePercentInput={variableExpensePercentInput}
          onSalePriceChange={setSalePriceInput}
          onVariableExpensePercentChange={setVariableExpensePercentInput}
          onAssemblyEnabledChange={setAssemblyEnabled}
        />
      )}
    </>
  );
}

// Phase 09.2 B3: componente helper que publica o state via useEffect.
// Extraido para manter a regra "useEffect so dentro de componente/hook".
function QuadroFinalPublisher({
  state,
  onChange
}: {
  state: QuadroFinalState;
  onChange: (state: QuadroFinalState) => void;
}) {
  // Serializar a chave para comparar deep sem re-render infinito.
  const serialized = JSON.stringify(state);
  useEffect(() => {
    onChange(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
  return null;
}
