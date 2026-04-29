import { z } from "zod";

function stripAccents(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAliasValue(value: string) {
  const normalized = stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("Alias nao pode ficar vazio.");
  }

  return normalized;
}

const resolveConflictSchema = z.object({
  conflictId: z.string().trim().min(1, "Conflito obrigatorio."),
  targetItemId: z.string().trim().min(1, "Item de destino obrigatorio."),
  executionId: z.string().trim().optional(),
  alias: z.string().trim().optional(),
  applyToExecutionName: z.boolean()
});

export type ResolveConflictPayload = z.infer<typeof resolveConflictSchema>;

export function parseResolveConflictFormData(formData: FormData) {
  const parsed = resolveConflictSchema.safeParse({
    conflictId: formData.get("conflictId")?.toString(),
    targetItemId: formData.get("targetItemId")?.toString(),
    executionId: formData.get("executionId")?.toString(),
    alias: formData.get("alias")?.toString(),
    applyToExecutionName: formData.get("applyToExecutionName") === "on"
  });

  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.flatten().fieldErrors
    };
  }

  return {
    success: true as const,
    data: parsed.data
  };
}
