"use server";

import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { getDemoStore } from "@/modules/platform/server/demo-data";
import { requireSession } from "@/modules/access/server/session-cookie";

export async function getItemSearchSuggestionsAction(query: string) {
  const q = query.trim();
  if (!q) return [];

  const session = await requireSession();
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);

  if (prisma) {
    try {
      const items = await prisma.item.findMany({
        where: {
          cd_restaurante: session.restaurantId,
          sn_ativo: true,
          OR: [
            { nm_item: { contains: q, mode: "insensitive" } },
            { ds_codigo_interno: { contains: q, mode: "insensitive" } },
            { nm_categoria_operacional: { contains: q, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: {
          nm_item: true,
          tp_item: true,
          nm_categoria_operacional: true
        }
      });

      return items.map((item) => ({
        label: item.nm_item,
        sublabel: `${item.tp_item.replace("_", " ")} · ${item.nm_categoria_operacional ?? "Sem categoria"}`,
        value: item.nm_item
      }));
    } catch {
      // fallback
    }
  }

  // Demo fallback
  const store = getDemoStore();
  return store.items
    .filter(
      (item) =>
        item.active &&
        (item.name.toLowerCase().includes(q.toLowerCase()) ||
          (item.code && item.code.toLowerCase().includes(q.toLowerCase())) ||
          (item.operationalCategory && item.operationalCategory.toLowerCase().includes(q.toLowerCase())))
    )
    .slice(0, 5)
    .map((item) => ({
      label: item.name,
      sublabel: `${item.type.replace("_", " ")} · ${item.operationalCategory ?? "Sem categoria"}`,
      value: item.name
    }));
}

export async function getFichaSearchSuggestionsAction(query: string) {
  const q = query.trim();
  if (!q) return [];

  const session = await requireSession();
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);

  if (prisma) {
    try {
      const fichas = await prisma.fichaTecnica.findMany({
        where: {
          cd_restaurante: session.restaurantId,
          OR: [
            { nm_exibicao: { contains: q, mode: "insensitive" } },
            { itemResultante: { nm_item: { contains: q, mode: "insensitive" } } },
            { itemResultante: { ds_codigo_interno: { contains: q, mode: "insensitive" } } }
          ]
        },
        take: 5,
        select: {
          nm_exibicao: true,
          itemResultante: {
            select: {
              nm_item: true,
              tp_item: true
            }
          },
          modalidade: {
            select: {
              nm_modalidade: true
            }
          }
        }
      });

      return fichas.map((ficha) => {
        const name = ficha.nm_exibicao || ficha.itemResultante.nm_item;
        return {
          label: name,
          sublabel: `${ficha.itemResultante.tp_item.replace("_", " ")} · ${ficha.modalidade?.nm_modalidade ?? "Sem modalidade"}`,
          value: name
        };
      });
    } catch {
      // fallback
    }
  }

  // Demo fallback
  const store = getDemoStore();
  return store.fichas
    .filter(
      (ficha) =>
        ficha.displayName.toLowerCase().includes(q.toLowerCase()) ||
        ficha.itemName.toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 5)
    .map((ficha) => ({
      label: ficha.displayName,
      sublabel: `${ficha.itemType.replace("_", " ")} · ${ficha.modalityLabel ?? "Sem modalidade"}`,
      value: ficha.displayName
    }));
}
