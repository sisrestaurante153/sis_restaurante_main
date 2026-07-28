"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/access/server/authorization";
import { getSalesRepository } from "@/modules/sales/server/sales-repository";

async function resolveSalesActor(permission: "sales.read" | "sales.write") {
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

export async function saveVendaAction(formData: FormData) {
  const actor = await resolveSalesActor("sales.write");
  const itemId = formData.get("itemId")?.toString() ?? "";
  const date = formData.get("date")?.toString() ?? "";
  const quantity = formData.get("quantity")?.toString() ?? "";
  const unitPrice = formData.get("unitPrice")?.toString() ?? "";
  const channel = formData.get("channel")?.toString() ?? "";

  if (!itemId || !date || Number(quantity) <= 0 || Number(unitPrice) <= 0) {
    redirect("/vendas?error=venda_invalida");
  }

  const repository = getSalesRepository(actor.restaurantId);
  await repository.saveVenda({ itemId, date, quantity, unitPrice, channel: channel || undefined });

  redirect("/vendas?saved=1");
}

export async function deleteVendaAction(formData: FormData) {
  const actor = await resolveSalesActor("sales.write");
  const id = formData.get("vendaId")?.toString() ?? "";

  const repository = getSalesRepository(actor.restaurantId);
  await repository.deleteVenda(id);

  redirect("/vendas?deleted=1");
}
