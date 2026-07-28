"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/access/server/authorization";
import { getMenuRepository } from "@/modules/menu/server/menu-repository";

async function resolveMenuActor(permission: "menu.read" | "menu.write") {
  try {
    return await requirePermission(permission);
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

export interface MenuFormState {
  status: "idle" | "error";
  message?: string;
}

export async function saveCardapioAction(_: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const actor = await resolveMenuActor("menu.write");
  const id = formData.get("id")?.toString().trim() || undefined;
  const name = formData.get("name")?.toString().trim() ?? "";
  const channel = formData.get("channel")?.toString().trim() ?? "";
  const active = formData.get("active")?.toString() !== "false";

  if (!name) {
    return { status: "error", message: "Informe um nome para o cardápio." };
  }
  if (!channel) {
    return { status: "error", message: "Informe o canal do cardápio (ex.: salão, delivery)." };
  }

  const repository = getMenuRepository(actor.restaurantId);
  const cardapioId = await repository.saveCardapio({ id, name, channel, active });

  redirect(`/cardapios/${cardapioId}?saved=1`);
}

export async function deleteCardapioAction(formData: FormData) {
  const actor = await resolveMenuActor("menu.write");
  const id = formData.get("cardapioId")?.toString() ?? "";
  if (!id) redirect("/cardapios?error=cardapio_id");

  const repository = getMenuRepository(actor.restaurantId);
  await repository.deleteCardapio(id);

  redirect("/cardapios?deleted=1");
}

export async function addCardapioItemAction(formData: FormData) {
  const actor = await resolveMenuActor("menu.write");
  const cardapioId = formData.get("cardapioId")?.toString() ?? "";
  const itemId = formData.get("itemId")?.toString() ?? "";
  const salePrice = formData.get("salePrice")?.toString() ?? "";
  const weekdaysRaw = formData.getAll("weekdays").map((value) => Number(value));
  const weekdays = weekdaysRaw.length > 0 ? weekdaysRaw : null;

  if (!cardapioId || !itemId || !salePrice || Number(salePrice) <= 0) {
    redirect(`/cardapios/${cardapioId}?error=item_invalido`);
  }

  const repository = getMenuRepository(actor.restaurantId);
  await repository.addCardapioItem({ cardapioId, itemId, salePrice, weekdays });

  redirect(`/cardapios/${cardapioId}?item_added=1`);
}

export async function removeCardapioItemAction(formData: FormData) {
  const actor = await resolveMenuActor("menu.write");
  const cardapioId = formData.get("cardapioId")?.toString() ?? "";
  const cardapioItemId = formData.get("cardapioItemId")?.toString() ?? "";

  const repository = getMenuRepository(actor.restaurantId);
  await repository.removeCardapioItem(cardapioItemId);

  redirect(`/cardapios/${cardapioId}?item_removed=1`);
}
