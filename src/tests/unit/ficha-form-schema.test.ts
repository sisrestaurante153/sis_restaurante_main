import { describe, expect, it } from "vitest";
import { parseFichaFormData } from "@/modules/engineering/server/ficha-form-schema";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

describe("ficha form schema", () => {
  it("parses a valid ficha payload with component rows", () => {
    const result = parseFichaFormData(
      buildFormData({
        itemId: "item-molho",
        displayName: "Molho Base de Tomate",
        itemType: "pre_preparo",
        groupOperational: "Cozinha quente",
        modalityId: "mod-producao",
        yieldUnitCode: "kg",
        status: "rascunho",
        yieldMode: "percentual_perda",
        percentLoss: "0.1200",
        finalWeight: "",
        portions: "12.0000",
        salePrice: "87.9000",
        variableExpensePercent: "0.1500",
        preparationMode: "Refogar e reduzir.",
        notes: "Observacao operacional.",
        stagesJson: JSON.stringify([
          {
            id: "stage-1",
            name: "Preparo",
            stageTypeId: "tipo-etapa-limpeza",
            stageTypeCode: "limpeza_pre_preparo",
            outputQuantity: "1.8000",
            correctionFactor: "1.000000",
            cookingIndex: "1.000000",
            notes: "",
            items: [
              {
                itemId: "item-tomate",
                componentType: "ingrediente",
                quantityUsed: "2.0000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: "Linha de processo"
              }
            ]
          }
        ])
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.components).toHaveLength(1);
      expect(result.data.yieldMode).toBe("percentual_perda");
      expect(result.data.salePrice).toBe("87.9000");
      expect(result.data.variableExpensePercent).toBe("0.1500");
      expect(result.data.stages[0]?.stageTypeId).toBe("tipo-etapa-limpeza");
      expect(result.data.components[0]?.stageTypeCode).toBe("limpeza_pre_preparo");
      expect(result.data.stages[0]?.correctionFactor).toBe("1.000000");
      expect(result.data.stages[0]?.cookingIndex).toBe("1.000000");
      expect(result.data.components[0]?.notes).toBe("Linha de processo");
    }
  });

  it("rejects malformed component payloads", () => {
    const result = parseFichaFormData(
      buildFormData({
        itemId: "item-molho",
        displayName: "Molho Base de Tomate",
        itemType: "pre_preparo",
        groupOperational: "Cozinha quente",
        modalityId: "mod-producao",
        yieldUnitCode: "kg",
        status: "rascunho",
        yieldMode: "percentual_perda",
        percentLoss: "0.1200",
        finalWeight: "",
        portions: "12.0000",
        preparationMode: "Refogar e reduzir.",
        notes: "Observacao operacional.",
        componentsJson: "nao-json"
      })
    );

    expect(result.success).toBe(false);
  });

  it("accepts optional process fields when blank", () => {
    const result = parseFichaFormData(
      buildFormData({
        itemId: "item-molho",
        displayName: "Molho Base de Tomate",
        itemType: "pre_preparo",
        groupOperational: "Cozinha quente",
        modalityId: "mod-producao",
        yieldUnitCode: "kg",
        status: "rascunho",
        yieldMode: "peso_final",
        percentLoss: "",
        finalWeight: "1.2000",
        portions: "12.0000",
        salePrice: "",
        variableExpensePercent: "",
        preparationMode: "Refogar e reduzir.",
        notes: "Observacao operacional.",
        stagesJson: JSON.stringify([
          {
            id: "stage-1",
            name: "Preparo",
            stageTypeId: "tipo-etapa-coccao",
            stageTypeCode: "coccao_preparo",
            outputQuantity: "1.2000",
            correctionFactor: "",
            cookingIndex: "",
            notes: "",
            items: [
              {
                itemId: "item-tomate",
                componentType: "ingrediente",
                quantityUsed: "2.0000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: ""
              }
            ]
          }
        ])
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.salePrice).toBeUndefined();
      expect(result.data.variableExpensePercent).toBeUndefined();
      expect(result.data.stages[0]?.correctionFactor).toBeUndefined();
      expect(result.data.stages[0]?.cookingIndex).toBeUndefined();
      expect(result.data.components[0]?.notes).toBe("");
    }
  });

  it("infers final weight from the last productive stage when montagem is the final stage", () => {
    const result = parseFichaFormData(
      buildFormData({
        itemId: "item-prato",
        displayName: "Prato Executivo",
        itemType: "prato",
        groupOperational: "Cozinha quente",
        modalityId: "mod-montagem",
        yieldUnitCode: "g-int",
        status: "ativa",
        yieldMode: "peso_final",
        percentLoss: "",
        finalWeight: "",
        portions: "1.0000",
        salePrice: "39.9000",
        variableExpensePercent: "0.1200",
        preparationMode: "Montar e embalar.",
        notes: "Ficha final com etapa de montagem.",
        stagesJson: JSON.stringify([
          {
            id: "stage-1",
            name: "Preparo base",
            stageTypeId: "tipo-etapa-coccao",
            stageTypeCode: "coccao_preparo",
            outputQuantity: "350.0000",
            correctionFactor: "",
            cookingIndex: "",
            notes: "",
            items: [
              {
                itemId: "item-molho",
                componentType: "ingrediente",
                quantityUsed: "1.0000",
                usageUnit: "kg",
                levelLabel: "N1",
                notes: ""
              }
            ]
          },
          {
            id: "assembly-stage",
            name: "Montagem e Descartaveis",
            stageTypeId: "tipo-etapa-montagem",
            stageTypeCode: "montagem",
            outputQuantity: "",
            correctionFactor: "",
            cookingIndex: "",
            notes: "",
            items: [
              {
                itemId: "item-embalagem",
                componentType: "embalagem",
                quantityUsed: "1.0000",
                usageUnit: "un",
                levelLabel: "N1",
                notes: ""
              }
            ]
          }
        ])
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.finalWeight).toBe("350.0000");
      expect(result.data.components).toHaveLength(2);
    }
  });
});
