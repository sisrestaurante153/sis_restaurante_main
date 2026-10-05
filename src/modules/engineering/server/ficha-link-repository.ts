import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { normalizeQuantityToCanonical } from "@/modules/platform/domain/units";
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

  return pendingItems.map((item) => ({
    itemId: item.cd_item,
    itemName: item.nm_item,
    itemType: item.tp_item,
    candidates: rankFichaCandidates(item.nm_item, candidateSources)
  }));
}

export interface SourceFichaForLink {
  fichaId: string;
  itemResultanteId: string;
  modoRendimento: "percentual_perda" | "peso_final";
  yieldGrams: number;
  components: Array<{ id: string; itemName: string; qtdBruta: string; qtdLimpa: string | null; unidadeUso: string }>;
}

// Carrega a ficha candidata com o suficiente para calcular a proporcao e
// mostrar uma pre-visualizacao antes/depois ao cliente. O rendimento da
// origem e convertido para gramas via a unidade canonica (kg) do sistema -
// NOTE: assume que o rendimento esta numa unidade de peso (kg/g); fichas com
// rendimento em unidade de contagem nao tem um "peso de origem" comparavel e
// devem cair no caminho sem calculo automatico (ver extractWeightInGrams).
export async function getSourceFichaForLink(fichaId: string, restaurantId: string): Promise<SourceFichaForLink | null> {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) return null;

  const ficha = await prisma.fichaTecnica.findUnique({
    where: { cd_ficha_tecnica: fichaId, cd_restaurante: restaurantId },
    include: {
      unidadeRendimento: { select: { ds_codigo: true } },
      componentes: {
        orderBy: { nr_ordem: "asc" },
        include: {
          itemComponente: { select: { nm_item: true } },
          unidadeUso: { select: { ds_codigo: true } }
        }
      }
    }
  });

  if (!ficha) return null;

  const yieldValue = ficha.tp_modo_rendimento === "peso_final" ? ficha.vl_peso_final : ficha.vl_rendimento_porcoes;
  if (!yieldValue || !ficha.unidadeRendimento) return null;

  const yieldKg = normalizeQuantityToCanonical(yieldValue.toString(), ficha.unidadeRendimento.ds_codigo);

  return {
    fichaId: ficha.cd_ficha_tecnica,
    itemResultanteId: ficha.cd_item_resultante,
    modoRendimento: ficha.tp_modo_rendimento,
    yieldGrams: yieldKg.times(1000).toNumber(),
    components: ficha.componentes.map((component) => ({
      id: component.cd_ficha_componente,
      itemName: component.itemComponente.nm_item,
      qtdBruta: component.vl_qtd_bruta.toString(),
      qtdLimpa: component.vl_qtd_limpa?.toString() ?? null,
      unidadeUso: component.unidadeUso.ds_codigo
    }))
  };
}
