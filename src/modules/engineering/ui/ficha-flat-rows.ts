import type {
  ComponentEditorRow,
  FichaStageEditor,
  StageTypeOption
} from "@/modules/engineering/ui/components-editor.types";

export const COCCAO_FINAL_CODE = "coccao_preparo";
export const MONTAGEM_CODE = "montagem";

function stripFlatMetadata(row: ComponentEditorRow): ComponentEditorRow {
  return {
    itemId: row.itemId,
    componentType: row.componentType,
    quantityUsed: row.quantityUsed,
    usageUnit: row.usageUnit,
    levelLabel: row.levelLabel,
    notes: row.notes,
    outputWeight: row.outputWeight
  };
}

export function isAssemblyStageLike(stage: FichaStageEditor, stageTypeOptions: StageTypeOption[]) {
  const byId = stageTypeOptions.find((option) => option.id === stage.stageTypeId);
  const byCode = stageTypeOptions.find((option) => option.code === stage.stageTypeCode);
  return (byId ?? byCode)?.code === MONTAGEM_CODE || stage.stageTypeCode === MONTAGEM_CODE;
}

export function isCoccaoFinalStage(stage: FichaStageEditor) {
  return stage.name === "Coccao Final" || stage.name === "Coccao / Preparo Final";
}

export function flattenStagesToRows(
  stages: FichaStageEditor[],
  stageTypeOptions: StageTypeOption[]
): ComponentEditorRow[] {
  const rows: ComponentEditorRow[] = [];

  for (const stage of stages) {
    if (isAssemblyStageLike(stage, stageTypeOptions)) continue;

    const isFinal = isCoccaoFinalStage(stage);

    // Coccao Final salvo sem itens (salvo apenas com outputQuantity): reconstrói
    // linha virtual para que FichaFlatGrid renderize o campo de rendimento.
    if (isFinal && stage.items.length === 0) {
      if (stage.outputQuantity) {
        rows.push({
          itemId: "",
          componentType: "ingrediente",
          quantityUsed: "1.0000",
          usageUnit: "kg",
          levelLabel: "N1",
          notes: "",
          stageTypeId: stage.stageTypeId,
          stageTypeCode: stage.stageTypeCode,
          stageTypeLabel: stage.stageTypeLabel,
          outputWeight: stage.outputQuantity,
          isCoccaoFinal: true
        });
      }
      continue;
    }

    const inputSum = stage.items.reduce((sum, item) => sum + Number(item.quantityUsed || "0"), 0);
    const stageOutput = Number(stage.outputQuantity || "0");
    const distributeOutput = inputSum > 0 && stageOutput > 0;

    for (const item of stage.items) {
      const proportion = distributeOutput ? Number(item.quantityUsed || "0") / inputSum : 0;
      const rowOutput = distributeOutput ? (stageOutput * proportion).toFixed(4) : "";

      rows.push({
        ...item,
        stageTypeId: stage.stageTypeId,
        stageTypeCode: stage.stageTypeCode,
        stageTypeLabel: stage.stageTypeLabel,
        outputWeight: item.outputWeight ?? rowOutput,
        isCoccaoFinal: isFinal
      });
    }
  }

  return rows;
}

export interface GroupedStageResult {
  stages: FichaStageEditor[];
  rowsWithoutStage: ComponentEditorRow[];
}

export function groupRowsToStages(
  rows: ComponentEditorRow[],
  stageTypeOptions: StageTypeOption[]
): GroupedStageResult {
  const stages: FichaStageEditor[] = [];
  const rowsWithoutStage: ComponentEditorRow[] = [];
  const buckets = new Map<string, ComponentEditorRow[]>();
  const order: string[] = [];

  for (const row of rows) {
    if (!row.stageTypeCode) {
      rowsWithoutStage.push(row);
      continue;
    }

    const bucketKey = row.isCoccaoFinal ? "__coccao_final__" : row.stageTypeCode;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
      order.push(bucketKey);
    }

    buckets.get(bucketKey)!.push(row);
  }

  let stageCounter = 0;

  for (const key of order) {
    const bucketRows = buckets.get(key) ?? [];
    const firstRow = bucketRows[0];
    const typeCode = firstRow.stageTypeCode!;
    const typeOption = stageTypeOptions.find(
      (option) => option.id === firstRow.stageTypeId || option.code === typeCode
    );
    const isFinal = key === "__coccao_final__";

    const outputSum = bucketRows.reduce((sum, row) => sum + (Number((row.outputWeight ?? "").replace(",", ".") || "0") || 0), 0);
    const outputQuantity = outputSum > 0 ? outputSum.toFixed(4) : "";

    stageCounter += 1;

    stages.push({
      id: isFinal ? `stage-coccao-final-${stageCounter}` : `stage-${stageCounter}`,
      name: isFinal
        ? "Coccao / Preparo Final"
        : typeOption?.label ?? firstRow.stageTypeLabel ?? `Etapa ${stageCounter}`,
      stageTypeId: typeOption?.id ?? firstRow.stageTypeId,
      stageTypeCode: typeOption?.code ?? typeCode,
      stageTypeLabel: typeOption?.label ?? firstRow.stageTypeLabel,
      outputQuantity,
      correctionFactor: "",
      cookingIndex: "",
      notes: "",
      // Coccao Final não tem ingredientes próprios — apenas carrega outputQuantity.
      // Incluir o item vazio (itemId:"") quebraria a validação Zod no backend.
      items: isFinal ? [] : bucketRows.map(stripFlatMetadata)
    });
  }

  if (rowsWithoutStage.length > 0) {
    stageCounter += 1;
    stages.push({
      id: `stage-${stageCounter}`,
      name: `Etapa ${stageCounter}`,
      outputQuantity: "",
      correctionFactor: "",
      cookingIndex: "",
      notes: "",
      items: rowsWithoutStage.map(stripFlatMetadata)
    });
  }

  return { stages, rowsWithoutStage };
}
