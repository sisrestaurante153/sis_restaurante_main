"use server";

import { redirect } from "next/navigation";
import { createAuditService } from "@/modules/audit/server/audit-service";
import { requirePermission } from "@/modules/access/server/authorization";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { parseFichaFormData } from "@/modules/engineering/server/ficha-form-schema";

export interface EngineeringFormState {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

async function resolveEngineeringActor() {
  try {
    return await requirePermission("ficha.write");
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return {
        userId: null,
        name: "Sistema",
        email: "system@sis-restaurante.local",
        roleCodes: ["admin"]
      };
    }

    throw error;
  }
}

export async function saveFichaAction(
  _: EngineeringFormState,
  formData: FormData
): Promise<EngineeringFormState> {
  const actor = await resolveEngineeringActor();
  const parsed = parseFichaFormData(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos da ficha.",
      errors: parsed.errors
    };
  }

  const repository = getEngineeringRepository();
  const before = parsed.data.id ? await repository.getFichaDetail(parsed.data.id) : null;
  const ficha = await repository.saveFicha(parsed.data);
  await createAuditService().record({
    actorId: actor.userId,
    actorName: actor.name,
    entity: "ficha_tecnica",
    entityId: ficha.id,
    entityLabel: `${ficha.itemName} v${ficha.version}`,
    action: before ? "ficha.updated" : "ficha.created",
    before,
    after: ficha
  });

  redirect(`/fichas/${ficha.id}?saved=1`);
}

export async function duplicateFichaAction(formData: FormData) {
  const actor = await resolveEngineeringActor();
  const fichaId = formData.get("id")?.toString();

  if (!fichaId) {
    redirect("/fichas");
  }

  const source = await getEngineeringRepository().getFichaDetail(fichaId);
  const ficha = await getEngineeringRepository().duplicateFicha(fichaId);
  await createAuditService().record({
    actorId: actor.userId,
    actorName: actor.name,
    entity: "ficha_tecnica",
    entityId: ficha.id,
    entityLabel: `${ficha.itemName} v${ficha.version}`,
    action: "ficha.duplicated",
    before: source,
    after: ficha
  });
  redirect(`/fichas/${ficha.id}?duplicated=1`);
}

export async function inactivateFichaAction(formData: FormData) {
  const actor = await resolveEngineeringActor();
  const fichaId = formData.get("id")?.toString();

  if (!fichaId) {
    redirect("/fichas");
  }

  const before = await getEngineeringRepository().getFichaDetail(fichaId);
  const ficha = await getEngineeringRepository().inactivateFicha(fichaId);
  await createAuditService().record({
    actorId: actor.userId,
    actorName: actor.name,
    entity: "ficha_tecnica",
    entityId: ficha.id,
    entityLabel: `${ficha.itemName} v${ficha.version}`,
    action: "ficha.inactivated",
    before,
    after: ficha
  });
  redirect(`/fichas/${fichaId}?inactivated=1`);
}
