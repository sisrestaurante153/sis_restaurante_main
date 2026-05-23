import "server-only";
import { z } from "zod";

const itemTypeSchema = z.enum([
  "insumo",
  "pre_preparo",
  "intermediario",
  "produto_pronto",
  "prato",
  "porcao",
  "marmita",
  "combo",
  "embalagem",
  "apoio"
]);

const fichaStatusSchema = z.enum(["rascunho", "ativa", "inativa", "arquivada"]);
const yieldModeSchema = z.enum(["percentual_perda", "peso_final"]);
const componentTypeSchema = z.enum(["ingrediente", "embalagem", "apoio"]);

const nonEmptyString = z.string().trim().min(1);
const optionalPositiveDecimalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ? value.replace(",", ".") : undefined)
  .refine((value) => value === undefined || Number(value) > 0, "Deve ser maior que zero.");
const optionalPercentString = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const num = Number(value.replace(",", "."));
    return Number.isFinite(num) ? (num > 1 ? (num / 100).toString() : num.toString()) : undefined;
  })
  .refine(
    (value) => value === undefined || (Number(value) >= 0 && Number(value) <= 1),
    "Deve estar entre 0 e 100%."
  );

const componentSchema = z.object({
  itemId: nonEmptyString,
  componentType: componentTypeSchema,
  quantityUsed: nonEmptyString,
  usageUnit: nonEmptyString,
  levelLabel: z.string().trim().optional().transform((value) => value || undefined),
  notes: z.string().trim().default(""),
  outputWeight: z.string().trim().optional(),
  correctionFactor: z.string().trim().optional(),
  cookingIndex: z.string().trim().optional()
});

const stageSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    name: nonEmptyString,
    stageTypeId: z.string().trim().optional().transform((value) => value || undefined),
    stageTypeCode: z.string().trim().optional().transform((value) => value || undefined),
    outputQuantity: z.string().trim().default(""),
    correctionFactor: z.string().trim().optional().transform((value) => value || undefined),
    cookingIndex: z.string().trim().optional().transform((value) => value || undefined),
    notes: z.string().trim().default(""),
    items: z.array(componentSchema)
  })
  .superRefine((stage, ctx) => {
    const isCoccaoFinal =
      stage.name === "Coccao / Preparo Final" || stage.name === "Coccao Final";
    // Ajuste 4: montagem vazia é ignorada no client (não chega aqui),
    // mas por segurança o servidor também a aceita sem itens.
    const isMontagem =
      stage.stageTypeCode === "montagem" || stage.name === "Montagem e Descartaveis";
    if (!isCoccaoFinal && !isMontagem && stage.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Adicione ao menos um item por etapa."
      });
    }
  });

const fichaFormSchema = z
  .object({
    id: z.string().trim().optional(),
    code: z.string().trim().optional(),
    itemId: z.string().trim().optional().transform((value) => value || undefined),
    displayName: nonEmptyString,
    itemType: itemTypeSchema,
    groupOperational: z.string().trim().min(1, "Grupo operacional obrigatorio."),
    modalityId: z.string().trim().min(1, "Modalidade obrigatoria."),
    yieldUnitCode: nonEmptyString,
    status: fichaStatusSchema,
    yieldMode: yieldModeSchema,
    percentLoss: z.string().trim().optional(),
    finalWeight: z.string().trim().optional(),
    portions: nonEmptyString,
    salePrice: optionalPositiveDecimalString,
    variableExpensePercent: optionalPercentString,
    // D-10 (Phase 09-01): HTML marca "(opcional)" na linha 429. Relaxado para
    // `z.string().default("")` — coluna Prisma FichaTecnica.modoPreparo permanece
    // nullable (String?) no schema; blast radius limitado a UI opcional; zero migration.
    preparationMode: z.string().default(""),
    notes: z.string().trim().default(""),
    stages: z.array(stageSchema).min(1, "Adicione ao menos uma etapa.")
  })
  .superRefine((value, context) => {
    if (value.yieldMode === "percentual_perda" && !value.percentLoss) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentLoss"],
        message: "Percentual de perda obrigatorio."
      });
    }

    const inferredFinalWeight = findLastStageOutputQuantity(value.stages);

    if (value.yieldMode === "peso_final" && !value.finalWeight && !inferredFinalWeight) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalWeight"],
        message: "Peso final obrigatorio."
      });
    }
  });

export type FichaFormPayload = z.infer<typeof fichaFormSchema>;

function findLastStageOutputQuantity(stages: Array<z.infer<typeof stageSchema>>) {
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    const outputQuantity = stages[index]?.outputQuantity?.trim();

    if (outputQuantity) {
      return outputQuantity;
    }
  }

  return undefined;
}

function flattenStageItems(stages: Array<z.infer<typeof stageSchema>>) {
  return stages.flatMap((stage) =>
    stage.items.map((item) => {
      const qtyGross = Number(item.quantityUsed) || 0;
      const qtyNet = item.outputWeight ? (Number(item.outputWeight) || qtyGross) : qtyGross;

      let itemCorrectionFactor = undefined;
      let itemCookingIndex = undefined;

      if (item.outputWeight) {
        const outVal = Number(item.outputWeight) || 0;
        if (qtyGross > 0 && outVal > 0) {
          const ratio = outVal / qtyGross;
          if (stage.stageTypeCode === "coccao_preparo") {
            itemCookingIndex = ratio.toString();
          } else {
            itemCorrectionFactor = ratio.toString();
          }
        }
      }

      return {
        ...item,
        quantityGross: item.quantityUsed,
        quantityNet: qtyNet.toString(),
        correctionFactor: itemCorrectionFactor ?? stage.correctionFactor,
        cookingIndex: itemCookingIndex ?? stage.cookingIndex,
        stageId: stage.id,
        stageTypeId: stage.stageTypeId,
        stageTypeCode: stage.stageTypeCode,
        stageName: stage.name
      };
    })
  );
}

function parseJsonField<T>(raw: string, errorKey: string, errorMessage: string) {
  try {
    return {
      success: true as const,
      value: JSON.parse(raw) as T
    };
  } catch {
    return {
      success: false as const,
      errors: {
        [errorKey]: [errorMessage]
      }
    };
  }
}

export function parseFichaFormData(formData: FormData) {
  const stagesJson = formData.get("stagesJson")?.toString() ?? "";
  const componentsJson = formData.get("componentsJson")?.toString() ?? "[]";
  let stages: unknown = [];

  if (stagesJson.trim().length > 0) {
    const parsedStages = parseJsonField<unknown>(stagesJson, "stagesJson", "Etapas invalidas.");

    if (!parsedStages.success) {
      return {
        success: false as const,
        errors: parsedStages.errors
      };
    }

    stages = parsedStages.value;
  } else {
    const parsedComponents = parseJsonField<Array<z.infer<typeof componentSchema>>>(
      componentsJson,
      "componentsJson",
      "Componentes invalidos."
    );

    if (!parsedComponents.success) {
      return {
        success: false as const,
        errors: parsedComponents.errors
      };
    }

    stages = [
      {
        id: "legacy-stage",
        name: "Etapa 1",
        outputQuantity: formData.get("finalWeight")?.toString() ?? "",
        correctionFactor: undefined,
        cookingIndex: undefined,
        notes: "",
        items: parsedComponents.value.map((component) => ({
          itemId: component.itemId,
          componentType: component.componentType,
          quantityUsed:
            (component as { quantityUsed?: string; quantityGross?: string; quantityNet?: string }).quantityUsed ??
            (component as { quantityGross?: string }).quantityGross ??
            (component as { quantityNet?: string }).quantityNet ??
            "",
          usageUnit: component.usageUnit,
          levelLabel: (component as { levelLabel?: string }).levelLabel,
          notes: component.notes ?? ""
        }))
      }
    ];
  }

  const parsed = fichaFormSchema.safeParse({
    id: formData.get("id")?.toString(),
    code: formData.get("code")?.toString(),
    itemId: formData.get("itemId")?.toString(),
    displayName: formData.get("displayName")?.toString(),
    itemType: formData.get("itemType")?.toString(),
    groupOperational: formData.get("groupOperational")?.toString(),
    modalityId: formData.get("modalityId")?.toString(),
    yieldUnitCode: formData.get("yieldUnitCode")?.toString(),
    status: formData.get("status")?.toString(),
    yieldMode: formData.get("yieldMode")?.toString(),
    percentLoss: formData.get("percentLoss")?.toString(),
    finalWeight: formData.get("finalWeight")?.toString(),
    portions: formData.get("portions")?.toString(),
    salePrice: formData.get("salePrice")?.toString(),
    variableExpensePercent: formData.get("variableExpensePercent")?.toString(),
    preparationMode: formData.get("preparationMode")?.toString(),
    notes: formData.get("notes")?.toString(),
    stages
  });

  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors
    };
  }

  return {
    success: true as const,
    data: {
      ...parsed.data,
      finalWeight: parsed.data.finalWeight?.trim() || findLastStageOutputQuantity(parsed.data.stages),
      components: flattenStageItems(parsed.data.stages)
    }
  };
}
