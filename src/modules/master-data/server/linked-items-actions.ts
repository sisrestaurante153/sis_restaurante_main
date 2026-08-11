"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/access/server/authorization";
import { getLinkedItemsRepository, type LinkedItemsResult } from "@/modules/master-data/server/linked-items-repository";

async function resolveActor() {
  try {
    return await requirePermission("item.write");
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return { userId: null, name: "Sistema", email: "system@sis-restaurante.local", roleCodes: ["admin"] };
    }
    throw error;
  }
}

const REDIRECT_PATH_BY_KIND: Record<string, string> = {
  supplier: "/cadastros/fornecedores",
  unit: "/cadastros/unidades",
  "operational-category": "/cadastros/categorias",
  modality: "/cadastros/modalidades",
  "item-type": "/cadastros/tipos-item",
  "stage-type": "/cadastros/tipos-etapa"
};

export async function listLinkedItemsAction(kind: string, recordId: string): Promise<LinkedItemsResult> {
  return getLinkedItemsRepository().list(kind, recordId);
}

export async function searchAddableItemsAction(kind: string, query: string) {
  return getLinkedItemsRepository().searchAddableItems(kind, query);
}

export async function addLinkedItemAction(kind: string, recordId: string, itemId: string) {
  await resolveActor();
  const result = await getLinkedItemsRepository().addLink(kind, recordId, itemId);
  if (result.ok) {
    revalidatePath(REDIRECT_PATH_BY_KIND[kind] ?? "/cadastros");
  }
  return result;
}

export async function removeLinkedItemAction(kind: string, recordId: string, itemId: string) {
  await resolveActor();
  const result = await getLinkedItemsRepository().removeLink(kind, recordId, itemId);
  if (result.ok) {
    revalidatePath(REDIRECT_PATH_BY_KIND[kind] ?? "/cadastros");
  }
  return result;
}
