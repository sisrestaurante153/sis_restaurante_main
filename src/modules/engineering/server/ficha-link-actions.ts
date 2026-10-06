"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/modules/access/server/session-cookie";
import { getEngineeringRepository } from "@/modules/engineering/server/engineering-repository";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) {
    throw new DomainInvariantError(`Campo obrigatorio ausente: ${name}.`);
  }
  return value;
}

// Vincula a ficha candidata exatamente como ela esta (ingredientes e
// rendimento inalterados) ao item pendente, a pedido explicito do cliente -
// sem clonar, sem recalcular proporcao.
export async function linkFichaToPendingItemAction(formData: FormData) {
  const session = await requireSession();

  try {
    const sourceFichaId = readField(formData, "sourceFichaId");
    const targetItemId = readField(formData, "targetItemId");

    await getEngineeringRepository(session.restaurantId).linkFichaToPendingItem({
      sourceFichaId,
      targetItemId
    });
  } catch {
    redirect("/fichas/vincular-pendentes?error=link");
  }

  redirect("/fichas/vincular-pendentes?linked=1");
}
