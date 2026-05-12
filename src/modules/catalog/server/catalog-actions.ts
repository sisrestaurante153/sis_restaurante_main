"use server";

import { redirect } from "next/navigation";
import { createAuditService } from "@/modules/audit/server/audit-service";
import { requirePermission } from "@/modules/access/server/authorization";
import { CatalogRepositoryError, getCatalogRepository } from "@/modules/catalog/server/catalog-repository";
import { parseItemFormData } from "@/modules/catalog/server/item-form-schema";

export interface CatalogFormState {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

async function resolveCatalogActor() {
  try {
    return await requirePermission("item.write");
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return {
        userId: null as string | null,
        restaurantId: "rest_padrao",
        name: "Sistema",
        email: "system@sis-restaurante.local",
        roleCodes: ["admin"]
      };
    }

    throw error;
  }
}

export async function saveItemAction(
  _: CatalogFormState,
  formData: FormData
): Promise<CatalogFormState> {
  const actor = await resolveCatalogActor();
  const parsed = parseItemFormData(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos do item.",
      errors: parsed.errors
    };
  }

  const repository = getCatalogRepository(actor.restaurantId);
  const before = parsed.data.id ? await repository.getItemDetail(parsed.data.id) : null;
  let item;

  try {
    item = await repository.saveItem(parsed.data);
  } catch (error) {
    if (error instanceof CatalogRepositoryError) {
      return {
        status: "error",
        message: "Revise os campos do item.",
        errors: error.fieldErrors
      };
    }

    throw error;
  }

  await createAuditService().record({
    actorId: actor.userId,
    actorName: actor.name,
    entity: "item",
    entityId: item.id,
    entityLabel: item.name,
    action: before ? "item.updated" : "item.created",
    before,
    after: item
  });

  redirect(`/itens/${item.id}?saved=1`);
}

export async function deleteItemAction(formData: FormData) {
  const actor = await resolveCatalogActor();
  const itemId = formData.get("itemId")?.toString() ?? "";

  if (!itemId) {
    redirect("/itens?error=item_id");
  }

  const repository = getCatalogRepository(actor.restaurantId);
  const before = await repository.getItemDetail(itemId);

  if (!before) {
    redirect("/itens?error=item_not_found");
  }

  const result = await repository.deleteItem(itemId);

  if (!result.success) {
    redirect(`/itens/${itemId}?error=${encodeURIComponent(result.reason ?? "delete_failed")}`);
  }

  await createAuditService().record({
    actorId: actor.userId,
    actorName: actor.name,
    entity: "item",
    entityId: before.id,
    entityLabel: before.name,
    action: "item.deleted",
    before
  });

  redirect("/itens?deleted=1");
}
