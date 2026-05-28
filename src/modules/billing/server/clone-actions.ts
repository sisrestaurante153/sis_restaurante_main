"use server";

import { requirePermission } from "@/modules/access/server/authorization";
import { getCloneRepository } from "./clone-repository";

export async function getCloneSummaryAction(originId: string) {
  await requirePermission("platform.manage");
  return getCloneRepository().getCloneSummary(originId);
}

export async function clonarDadosAction(input: {
  originId: string;
  destinationId: string;
  cloneItems: boolean;
  clonePurchases: boolean;
  cloneFichas: boolean;
}) {
  await requirePermission("platform.manage");

  if (input.originId === input.destinationId) {
    return {
      ok: false as const,
      message: "Os restaurantes de origem e destino não podem ser iguais."
    };
  }

  const repo = getCloneRepository();
  
  let itemsCreated = 0;
  let itemsIgnored = 0;
  let purchasesCreated = 0;
  let purchasesIgnored = 0;
  let fichasCreated = 0;
  let fichasIgnored = 0;
  
  let mapping: Record<string, string> = {};

  try {
    if (input.cloneItems) {
      const itemsRes = await repo.cloneItems(input.originId, input.destinationId);
      mapping = itemsRes.mapping;
      itemsCreated = itemsRes.created;
      itemsIgnored = itemsRes.ignored;
    }

    if (input.clonePurchases) {
      const purRes = await repo.clonePurchases(input.originId, input.destinationId, mapping);
      purchasesCreated = purRes.created;
      purchasesIgnored = purRes.ignored;
    }

    if (input.cloneFichas) {
      const fichasRes = await repo.cloneFichas(input.originId, input.destinationId, mapping);
      fichasCreated = fichasRes.created;
      fichasIgnored = fichasRes.ignored;
    }

    return {
      ok: true as const,
      report: {
        itemsCreated,
        itemsIgnored,
        purchasesCreated,
        purchasesIgnored,
        fichasCreated,
        fichasIgnored
      }
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Erro interno ao clonar dados."
    };
  }
}
