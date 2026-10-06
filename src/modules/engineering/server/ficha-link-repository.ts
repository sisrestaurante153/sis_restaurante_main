import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { rankFichaCandidates, type FichaCandidate } from "@/modules/engineering/domain/ficha-link-matching";

const SELLABLE_TYPES = ["prato", "porcao", "marmita", "combo"] as const;

export interface PendingFichaItem {
  itemId: string;
  itemName: string;
  itemType: string;
  candidates: FichaCandidate[];
}

// Lista, sempre calculada ao vivo (sem cache), todo item vendavel sem ficha
// tecnica ativa, com ate 3 fichas existentes (de outros itens) sugeridas
// como candidatas por semelhanca de nome.
export async function listPendingFichaItems(restaurantId: string): Promise<PendingFichaItem[]> {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);

  if (!prisma) {
    return [];
  }

  const [pendingItems, candidatePool] = await Promise.all([
    prisma.item.findMany({
      where: {
        cd_restaurante: restaurantId,
        sn_ativo: true,
        tp_item: { in: [...SELLABLE_TYPES] },
        fichasResultantes: { none: { tp_status: "ativa" } }
      },
      select: { cd_item: true, nm_item: true, tp_item: true },
      orderBy: { nm_item: "asc" }
    }),
    prisma.item.findMany({
      where: {
        cd_restaurante: restaurantId,
        sn_ativo: true,
        fichasResultantes: { some: { tp_status: "ativa" } }
      },
      select: {
        cd_item: true,
        nm_item: true,
        fichasResultantes: {
          where: { tp_status: "ativa" },
          select: { cd_ficha_tecnica: true },
          take: 1
        }
      }
    })
  ]);

  const candidateSources = candidatePool
    .filter((item) => item.fichasResultantes.length > 0)
    .map((item) => ({
      itemId: item.cd_item,
      itemName: item.nm_item,
      fichaId: item.fichasResultantes[0].cd_ficha_tecnica
    }));

  // Quantas fichas usam cada item candidato como ingrediente - exibido como
  // aviso antes de reatribuir (vincular nao clona, entao reatribuir uma
  // ficha que e insumo de outras receitas afeta essas receitas tambem).
  const usageCounts = await prisma.fichaComponente.groupBy({
    by: ["cd_item_componente"],
    where: {
      cd_item_componente: { in: candidateSources.map((candidate) => candidate.itemId) },
      fichaTecnica: { cd_restaurante: restaurantId }
    },
    _count: { cd_item_componente: true }
  });
  const usageByItemId = new Map(usageCounts.map((row) => [row.cd_item_componente, row._count.cd_item_componente]));

  return pendingItems.map((item) => ({
    itemId: item.cd_item,
    itemName: item.nm_item,
    itemType: item.tp_item,
    candidates: rankFichaCandidates(item.nm_item, candidateSources).map((candidate) => ({
      ...candidate,
      usedAsIngredientCount: usageByItemId.get(candidate.itemId) ?? 0
    }))
  }));
}
