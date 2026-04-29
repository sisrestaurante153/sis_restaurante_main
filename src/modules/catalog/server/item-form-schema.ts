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

const positiveDecimal = z
  .string()
  .trim()
  .refine((value) => Number(value) > 0, "Deve ser maior que zero.");

const purchaseSchema = z.object({
  supplierName: z.string().trim().min(1, "Fornecedor obrigatorio."),
  purchaseUnit: z.string().trim().min(1, "Unidade de compra obrigatoria."),
  purchaseIsPrimary: z.boolean().default(false),
  purchaseQuantity: positiveDecimal,
  purchaseCost: positiveDecimal,
  priceUpdatedAt: z.string().trim().min(1, "Data de atualizacao obrigatoria."),
  // D-05/D-08: usageUnit + usageQuantity obrigatorios no principal; ignorados nos secundarios.
  usageUnit: z.string().trim().optional(),
  usageQuantity: z.string().trim().optional(),
  usagePrice: z.string().trim().optional()
});

// Phase 08-04: top-level stockUnit/usageUnit/conversionFactor REMOVIDOS.
// Fonte de verdade agora e purchases[] per fornecedor (08-02 schema + 08-03 UI).
// Legacy columns item.unidadeEstoqueId/item.unidadeUsoPadraoId ficam nullable no DB
// (D-03), populadas via derivacao do purchase principal na escrita do repository.
const itemFormSchema = z.object({
  id: z.string().trim().optional(),
  code: z.string().trim().min(1, "Codigo obrigatorio."),
  name: z.string().trim().min(1, "Nome obrigatorio."),
  type: itemTypeSchema,
  operationalCategory: z.string().trim().min(1, "Categoria obrigatoria."),
  description: z.string().trim().default(""),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  purchases: z
    .array(purchaseSchema)
    .min(1, "Ao menos uma compra e obrigatoria.")
    .transform((rows) => {
      const hasPrimary = rows.some((row) => row.purchaseIsPrimary);
      return rows.map((row, index) => ({
        ...row,
        purchaseIsPrimary: hasPrimary ? row.purchaseIsPrimary : index === 0
      }));
    })
    .superRefine((rows, context) => {
      const primaryCount = rows.filter((row) => row.purchaseIsPrimary).length;

      if (primaryCount > 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione apenas um fornecedor principal.",
          path: []
        });
      }

      // D-08: principal precisa de usageUnit + usageQuantity > 0.
      const primaryIdx = rows.findIndex((row) => row.purchaseIsPrimary);
      if (primaryIdx >= 0) {
        const primary = rows[primaryIdx];
        if (!primary.usageUnit || primary.usageUnit.trim().length === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Unidade de uso obrigatoria no fornecedor principal.",
            path: [primaryIdx, "usageUnit"]
          });
        }
        const qu = Number(primary.usageQuantity);
        if (!primary.usageQuantity || !Number.isFinite(qu) || qu <= 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Quantidade de uso deve ser maior que zero no fornecedor principal.",
            path: [primaryIdx, "usageQuantity"]
          });
        }
      }
    })
});

export type ItemFormPayload = z.infer<typeof itemFormSchema>;

function readPurchasesFromFields(formData: FormData) {
  const supplierNames = formData.getAll("purchaseSupplierName").map((value) => value.toString());
  const purchaseUnits = formData.getAll("purchaseUnit").map((value) => value.toString());
  const purchaseIsPrimaryValues = formData.getAll("purchaseIsPrimary").map((value) => value.toString());
  const purchaseQuantities = formData.getAll("purchaseQuantity").map((value) => value.toString());
  const purchaseCosts = formData.getAll("purchaseCost").map((value) => value.toString());
  const priceUpdatedAts = formData.getAll("purchasePriceUpdatedAt").map((value) => value.toString());
  const purchaseUsageUnits = formData.getAll("purchaseUsageUnit").map((value) => value.toString());
  const purchaseUsageQuantities = formData.getAll("purchaseUsageQuantity").map((value) => value.toString());
  const rowCount = Math.max(
    supplierNames.length,
    purchaseUnits.length,
    purchaseIsPrimaryValues.length,
    purchaseQuantities.length,
    purchaseCosts.length,
    priceUpdatedAts.length
  );

  if (rowCount === 0) {
    return null;
  }

  return Array.from({ length: rowCount }, (_, index) => ({
    supplierName: supplierNames[index] ?? "",
    purchaseUnit: purchaseUnits[index] ?? "",
    purchaseIsPrimary: purchaseIsPrimaryValues[index] === "true",
    purchaseQuantity: purchaseQuantities[index] ?? "",
    purchaseCost: purchaseCosts[index] ?? "",
    priceUpdatedAt: priceUpdatedAts[index] ?? "",
    usageUnit: purchaseUsageUnits[index],
    usageQuantity: purchaseUsageQuantities[index]
  })).filter((row) =>
    [row.supplierName, row.purchaseUnit, row.purchaseQuantity, row.purchaseCost, row.priceUpdatedAt].some((value) =>
      value.trim().length > 0
    )
  );
}

export function parseItemFormData(formData: FormData) {
  const purchasesFromFields = readPurchasesFromFields(formData);
  let purchases: unknown = purchasesFromFields;

  if (!purchasesFromFields) {
    const purchasesJson = formData.get("purchasesJson")?.toString() ?? "[]";

    try {
      purchases = JSON.parse(purchasesJson);
    } catch {
      return {
        success: false as const,
        errors: {
          purchasesJson: ["Compras invalidas."]
        }
      };
    }
  }

  const parsed = itemFormSchema.safeParse({
    id: formData.get("id")?.toString(),
    code: formData.get("code")?.toString(),
    name: formData.get("name")?.toString(),
    type: formData.get("type")?.toString(),
    operationalCategory: formData.get("operationalCategory")?.toString(),
    description: formData.get("description")?.toString(),
    active: formData.get("active")?.toString(),
    purchases
  });

  if (!parsed.success) {
    // Quick 20260421 T1: preservar erros aninhados de purchases[N].campo
    // em keys de caminho "purchases.N.campo" (alem das keys top-level) para
    // que a UI possa listar per-row o motivo exato do save silenciar
    // Fornecedor 2. O flatten() do Zod so expoe keys top-level; erros
    // nested aninhados se perdem para a UI.
    const flattened = parsed.error.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >;
    const errors: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(flattened)) {
      if (value && value.length > 0) {
        errors[key] = value;
      }
    }

    for (const issue of parsed.error.issues) {
      if (issue.path.length > 1 && issue.path[0] === "purchases") {
        const pathKey = issue.path.join(".");
        if (!errors[pathKey]) {
          errors[pathKey] = [];
        }
        errors[pathKey].push(issue.message);
      }
    }

    return {
      success: false as const,
      errors: errors as Record<string, string[] | undefined>
    };
  }

  return {
    success: true as const,
    data: parsed.data
  };
}
