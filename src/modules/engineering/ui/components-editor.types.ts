export interface ComponentEditorRow {
  itemId: string;
  componentType: "ingrediente" | "embalagem" | "apoio";
  quantityUsed: string;
  usageUnit: string;
  levelLabel?: string;
  notes?: string;
  stageTypeId?: string;
  stageTypeCode?: string;
  stageTypeLabel?: string;
  outputWeight?: string;
  isCoccaoFinal?: boolean;
}

export interface FichaStageEditor {
  id: string;
  name: string;
  stageTypeId?: string;
  stageTypeCode?: string;
  stageTypeLabel?: string;
  outputQuantity: string;
  correctionFactor?: string;
  cookingIndex?: string;
  notes?: string;
  items: ComponentEditorRow[];
}

export interface StageTypeOption {
  id: string;
  code: string;
  label: string;
}

export interface ComponentOption {
  id: string;
  name: string;
  type: string;
  code?: string;
  operationalCategory?: string;
  usageUnit: string;
  currentCost?: string;
  finalOutput?: string;
  linkedFichaId?: string;
  linkedFichaName?: string;
}

export interface ComponentsEditorSummary {
  totalGross: string;
  totalNet: string;
  postCookingWeight: string;
  cookingFactorGross: string | null;
  cookingFactorNet: string | null;
  totalInputCost: string;
  costWithoutPackagingPerKg: string | null;
  costWithPackagingPerKg?: string | null;
  cmvPerKg: string;
  packagingCost: string;
  finalAppliedCmv?: string | null;
  finalAppliedCmvLabel?: string;
  cmvHealthStatus?: "Saudavel" | "Atencao" | "Critico" | "Indefinido";
  cmvHealthPercent?: string | null;
  cmvPercentOfSale?: string | null;
  salePrice?: string;
  referencePriceLabel?: string;
  referencePrice?: string;
  variableExpensePercent?: string;
  variableExpensePercentLabel?: string;
  variableExpenseApplied?: string | null;
  variableExpenseAppliedLabel?: string;
  contributionMarginValue?: string;
  contributionMarginPercent?: string;
  operationalMarginContribution?: string | null;
  operationalMarginContributionLabel?: string;
  mealCmv?: string;
  packagingShareOnCmv?: string;
  costReal: string;
  preparationModePreview?: string;
  automaticDiagnosis?: string;
  automaticDiagnosisLabel?: string;
  assemblyEnabled?: boolean;
  yieldUnit?: string;
}

export interface StageMetricSummary {
  inputQuantity: string;
  outputQuantity: string;
  correctionFactor: string;
  cookingIndex: string;
  totalCost: string;
  weightDelta: string;
  weightDeltaPercent: string;
}
