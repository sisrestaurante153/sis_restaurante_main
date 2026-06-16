"use server";

import { redirect } from "next/navigation";
import { createAuditService } from "@/modules/audit/server/audit-service";
import { requirePermission } from "@/modules/access/server/authorization";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { parseFichaFormData } from "@/modules/engineering/server/ficha-form-schema";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

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
        restaurantId: "rest_padrao",
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

  const repository = getEngineeringRepository(actor.restaurantId);
  const before = parsed.data.id ? await repository.getFichaDetail(parsed.data.id) : null;

  let ficha;
  try {
    ficha = await repository.saveFicha(parsed.data);
  } catch (error) {
    if (error instanceof DomainInvariantError) {
      return { status: "error", message: error.message };
    }
    const message = error instanceof Error ? error.message : "Erro inesperado ao salvar a ficha.";
    return { status: "error", message: `Erro ao salvar a ficha: ${message}` };
  }

  if (!ficha) {
    return { status: "error", message: "Erro ao salvar a ficha: resultado não retornado." };
  }

  try {
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
  } catch {
    // Falha no audit não deve bloquear o salvamento da ficha
  }

  redirect("/fichas");
}

export interface AutoSaveResult {
  ok: boolean;
  message?: string;
}

// Salva a ficha como rascunho sem redirecionar — usado pelo autosave do editor.
// Retorna { ok: true } em caso de sucesso ou { ok: false, message } em falha.
export async function autoSaveFichaAction(formData: FormData): Promise<AutoSaveResult> {
  const actor = await resolveEngineeringActor();
  formData.set("status", "rascunho");
  const parsed = parseFichaFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos para o autosave." };
  }

  const repository = getEngineeringRepository(actor.restaurantId);
  try {
    await repository.saveFicha(parsed.data);
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainInvariantError) {
      return { ok: false, message: error.message };
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return { ok: false, message };
  }
}

export async function duplicateFichaAction(formData: FormData) {
  const actor = await resolveEngineeringActor();
  const fichaId = formData.get("id")?.toString();

  if (!fichaId) {
    redirect("/fichas");
  }

  const source = await getEngineeringRepository(actor.restaurantId).getFichaDetail(fichaId);
  const ficha = await getEngineeringRepository(actor.restaurantId).duplicateFicha(fichaId);

  try {
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
  } catch {
    // Falha no audit não deve bloquear o redirect
  }

  redirect(`/fichas/${ficha.id}?duplicated=1`);
}

export interface PatchFichaQuickResult {
  ok: boolean;
  message?: string;
}

export async function patchFichaQuickAction(input: {
  fichaId: string;
  name?: string;
  sellingPrice?: string;
}): Promise<PatchFichaQuickResult> {
  const actor = await resolveEngineeringActor();
  const repository = getEngineeringRepository(actor.restaurantId);
  try {
    await repository.patchFichaQuick(input);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar.";
    return { ok: false, message };
  }
}

export async function inactivateFichaAction(formData: FormData) {
  const actor = await resolveEngineeringActor();
  const fichaId = formData.get("id")?.toString();

  if (!fichaId) {
    redirect("/fichas");
  }

  const before = await getEngineeringRepository(actor.restaurantId).getFichaDetail(fichaId);
  const ficha = await getEngineeringRepository(actor.restaurantId).inactivateFicha(fichaId);

  try {
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
  } catch {
    // Falha no audit não deve bloquear o redirect
  }

  redirect(`/fichas/${fichaId}?inactivated=1`);
}

export async function checkDuplicateFichaNameAction(name: string, excludeFichaId?: string): Promise<boolean> {
  const actor = await resolveEngineeringActor();
  const repository = getEngineeringRepository(actor.restaurantId);
  return repository.checkDuplicateName(name, excludeFichaId);
}

export async function checkFichaDeletionAllowedAction(fichaId: string): Promise<Array<{ id: string, name: string }>> {
  const actor = await resolveEngineeringActor();
  const repository = getEngineeringRepository(actor.restaurantId);
  return repository.checkFichaDeletionAllowed(fichaId);
}

export async function deleteFichaAction(fichaId: string): Promise<void> {
  const actor = await resolveEngineeringActor();
  const repository = getEngineeringRepository(actor.restaurantId);
  const before = await repository.getFichaDetail(fichaId);

  await repository.deleteFicha(fichaId);

  if (before) {
    try {
      await createAuditService().record({
        actorId: actor.userId,
        actorName: actor.name,
        entity: "ficha_tecnica",
        entityId: fichaId,
        entityLabel: `${before.itemName} v${before.version}`,
        action: "ficha.deleted",
        before,
        after: null
      });
    } catch {
      // ignore audit failures
    }
  }

  redirect("/fichas");
}
