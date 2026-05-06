import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  buildDependencyClosure,
  type DirectCompositionEdge
} from "@/modules/engineering/domain/composition";
import {
  calculateItemCost,
  type CalculationGraph,
  type CalculatedItemCost,
  type ImpactRow
} from "@/modules/engineering/domain/cost-engine";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";
import { normalizeQuantityToCanonical } from "@/modules/platform/domain/units";

type TransactionClient = Prisma.TransactionClient;

function normalizeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function serializeCalculatedItem(result: CalculatedItemCost) {
  return {
    itemId: result.itemId,
    itemName: result.itemName,
    totalCost: result.totalCost.toString(),
    directCost: result.directCost.toString(),
    inheritedCost: result.inheritedCost.toString(),
    finalUsefulOutputQuantity: result.finalUsefulOutputQuantity.toString(),
    costPerKg: result.costPerKg.toString(),
    costPerPortion: result.costPerPortion?.toString() ?? null,
    costPerFinalItem: result.costPerFinalItem.toString(),
    components: result.components.map((component) => ({
      componentId: component.componentId,
      componentItemId: component.componentItemId,
      componentName: component.componentName,
      componentType: component.componentType,
      quantityGross: component.quantityGross.toString(),
      quantityNet: component.quantityNet.toString(),
      factorCorrecaoEquivalente: component.factorCorrecaoEquivalente.toString(),
      indiceCoccaoEquivalente: component.indiceCoccaoEquivalente?.toString() ?? null,
      directCost: component.directCost.toString(),
      inheritedCost: component.inheritedCost.toString(),
      totalCost: component.totalCost.toString()
    })),
    expandedBreakdown: result.expandedBreakdown.map((row) => ({
      itemId: row.itemId,
      itemName: row.itemName,
      path: row.path,
      totalCost: row.totalCost.toString()
    }))
  };
}

async function loadItemNode(tx: TransactionClient, itemId: string) {
  return tx.item.findUnique({
    where: { cd_item: itemId },
    include: {
      unidadeUsoPadrao: true,
      custosSnapshot: {
        orderBy: { ts_calculo: "desc" },
        take: 1
      },
      compras: {
        orderBy: [{ ts_atualizacao_preco: "desc" }, { ts_criacao: "desc" }],
        take: 1
      },
      fichasResultantes: {
        where: { tp_status: "ativa" },
        orderBy: { nr_versao: "desc" },
        take: 1,
        include: {
          componentes: {
            orderBy: { nr_ordem: "asc" },
            include: {
              unidadeUso: true
            }
          }
        }
      }
    }
  });
}

async function loadCalculationGraph(tx: TransactionClient, rootItemIds: readonly string[]) {
  const graph: CalculationGraph = {};
  const queue = [...rootItemIds];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const itemId = queue.shift();
    if (!itemId || visited.has(itemId)) {
      continue;
    }

    visited.add(itemId);
    const item = await loadItemNode(tx, itemId);

    if (!item) {
      throw new DomainInvariantError(`Item ${itemId} nao encontrado para calculo.`);
    }

    const activeFicha = item.fichasResultantes[0];
    graph[item.cd_item] = {
      id: item.cd_item,
      name: item.nm_item,
      unitType: activeFicha
        ? "massa"
        : item.unidadeUsoPadrao?.tp_unidade === "contagem"
          ? "contagem"
          : "massa",
      baseUnitCost: activeFicha
        ? item.custosSnapshot[0]?.vl_custo_kg_uso?.toString() ??
          item.compras[0]?.vl_custo_unitario_base.toString() ??
          "0"
        : item.compras[0]?.vl_custo_unitario_base.toString() ??
          item.custosSnapshot[0]?.vl_custo_kg_uso?.toString() ??
          "0",
      ficha: activeFicha
        ? {
            mode: activeFicha.tp_modo_rendimento,
            percentualPerda: activeFicha.vl_pct_perda?.toString(),
            pesoFinalInformado: activeFicha.vl_peso_final?.toString(),
            rendimentoPorcoes: activeFicha.vl_rendimento_porcoes?.toString(),
            components: activeFicha.componentes.map((component) => ({
              id: component.cd_ficha_componente,
              itemId: component.cd_item_componente,
              componentType: component.tp_componente,
              quantityGross: normalizeQuantityToCanonical(
                component.vl_qtd_bruta.toString(),
                component.unidadeUso.ds_codigo
              ).toString(),
              quantityNet: component.vl_qtd_limpa
                ? normalizeQuantityToCanonical(
                    component.vl_qtd_limpa.toString(),
                    component.unidadeUso.ds_codigo
                  ).toString()
                : null,
              unitType:
                component.unidadeUso.tp_unidade === "contagem"
                  ? "contagem"
                  : component.unidadeUso.tp_unidade === "volume"
                    ? "volume"
                    : "massa",
              correctionFactor: component.vl_fator_correcao?.toString() ?? null,
              cookingIndex: component.vl_indice_coccao?.toString() ?? null
            }))
          }
        : undefined
    };

    for (const component of activeFicha?.componentes ?? []) {
      queue.push(component.cd_item_componente);
    }
  }

  return graph;
}

async function loadAllActiveEdges(tx: TransactionClient): Promise<DirectCompositionEdge[]> {
  const fichas = await tx.fichaTecnica.findMany({
    where: { tp_status: "ativa" },
    select: {
      cd_item_resultante: true,
      componentes: {
        select: {
          cd_item_componente: true
        }
      }
    }
  });

  return fichas.flatMap((ficha) =>
    ficha.componentes
      .filter((component) => component.cd_item_componente !== ficha.cd_item_resultante)
      .map((component) => ({
        parentItemId: ficha.cd_item_resultante,
        childItemId: component.cd_item_componente
      }))
  );
}

export async function assertNoCyclesBeforeSaving(
  tx: TransactionClient,
  itemResultanteId: string,
  componentItemIds: readonly string[]
) {
  if (componentItemIds.some((id) => id === itemResultanteId)) {
    throw new DomainInvariantError("Um item nao pode compor a si mesmo.");
  }

  const edges = (await loadAllActiveEdges(tx)).filter((edge) => edge.parentItemId !== itemResultanteId);

  edges.push(
    ...componentItemIds.map((componentItemId) => ({
      parentItemId: itemResultanteId,
      childItemId: componentItemId
    }))
  );

  buildDependencyClosure(edges);
}

export async function rebuildDependencyClosure(tx: TransactionClient) {
  const edges = await loadAllActiveEdges(tx);
  const closure = buildDependencyClosure(edges);

  await tx.dependenciaItem.deleteMany();

  if (closure.length > 0) {
    await tx.dependenciaItem.createMany({
      data: closure.map((row) => ({
        cd_item_ascendente: row.itemAscendenteId,
        cd_item_descendente: row.itemDescendenteId,
        nr_profundidade: row.profundidade,
        sn_relacao_direta: row.relacaoDireta
      }))
    });
  }

  return closure;
}

async function persistCalculationTrail(
  tx: TransactionClient,
  result: CalculatedItemCost,
  reason: string,
  triggerItemId?: string | null
) {
  const activeFicha = await tx.fichaTecnica.findFirst({
    where: {
      cd_item_resultante: result.itemId,
      tp_status: "ativa"
    },
    orderBy: { nr_versao: "desc" }
  });

  const latestSnapshot = await tx.custoSnapshotItem.findFirst({
    where: { cd_item: result.itemId },
    orderBy: { ts_calculo: "desc" }
  });

  const execution = await tx.calculoExecucao.create({
    data: {
      cd_item: result.itemId,
      cd_ficha_tecnica: activeFicha?.cd_ficha_tecnica ?? null,
      cd_item_gatilho: triggerItemId ?? null,
      ds_motivo: reason,
      vl_custo_anterior: latestSnapshot?.vl_custo_total ?? null,
      vl_custo_novo: result.totalCost.toString(),
      vl_qtd_saida: result.finalUsefulOutputQuantity.toString(),
      js_metadados: normalizeJson(serializeCalculatedItem(result))
    }
  });

  for (const component of result.components) {
    await tx.calculoComponenteSnapshot.create({
      data: {
        cd_calculo_execucao: execution.cd_calculo,
        cd_ficha_componente: component.componentId,
        cd_item_componente: component.componentItemId,
        ds_caminho: component.componentName,
        nr_profundidade: 1,
        tp_componente: component.componentType,
        vl_qtd_bruta: component.quantityGross.toString(),
        vl_qtd_liquida: component.quantityNet.toString(),
        vl_fator_correcao_equiv: component.factorCorrecaoEquivalente.toString(),
        vl_indice_coccao_equiv: component.indiceCoccaoEquivalente?.toString() ?? null,
        vl_custo_direto: component.directCost.toString(),
        vl_custo_herdado: component.inheritedCost.toString(),
        vl_custo_total: component.totalCost.toString(),
        vl_pct_impacto: result.totalCost.equals(0)
          ? null
          : component.totalCost.div(result.totalCost).toString()
      }
    });
  }

  const packagingCost = result.components
    .filter((component) => component.componentType !== "ingrediente")
    .reduce((sum, component) => sum.add(component.totalCost), new Prisma.Decimal(0));

  await tx.custoSnapshotItem.create({
    data: {
      cd_item: result.itemId,
      cd_calculo_execucao: execution.cd_calculo,
      vl_custo_unitario:
        result.unitType === "contagem"
          ? result.costPerFinalItem.toString()
          : result.costPerKg.toString(),
      vl_custo_kg_uso:
        result.unitType === "contagem"
          ? result.costPerFinalItem.toString()
          : result.costPerKg.toString(),
      vl_custo_embalagem: packagingCost.toString(),
      vl_custo_total: result.totalCost.toString(),
      ds_origem_recalculo: reason
    }
  });

  return execution;
}

export async function recalculateItemInTransaction(
  tx: TransactionClient,
  itemId: string,
  reason: string,
  triggerItemId?: string | null
) {
  const graph = await loadCalculationGraph(tx, [itemId]);
  const result = calculateItemCost(graph, itemId);
  const execution = await persistCalculationTrail(tx, result, reason, triggerItemId);

  return { result, execution };
}

export async function recalculateCascade(
  prisma: PrismaClient,
  changedItemIds: readonly string[],
  reason: string
) {
  return prisma.$transaction(async (tx) => {
    const closureRows = await tx.dependenciaItem.findMany({
      where: {
        cd_item_descendente: { in: [...changedItemIds] }
      },
      include: {
        itemAscendente: true
      }
    });

    const impacted = new Map<string, number>();

    for (const itemId of changedItemIds) {
      impacted.set(itemId, 0);
    }

    for (const row of closureRows) {
      if (row.nr_profundidade === 0) {
        continue;
      }

      const current = impacted.get(row.cd_item_ascendente);
      if (current === undefined || row.nr_profundidade < current) {
        impacted.set(row.cd_item_ascendente, row.nr_profundidade);
      }
    }

    const order = [...impacted.entries()]
      .sort((left, right) => {
        if (left[1] === right[1]) {
          return left[0].localeCompare(right[0]);
        }

        return left[1] - right[1];
      })
      .map(([itemId]) => itemId);

    const impactRows: ImpactRow[] = [];

    for (const itemId of order) {
      const before = await tx.custoSnapshotItem.findFirst({
        where: { cd_item: itemId },
        orderBy: { ts_calculo: "desc" }
      });

      const { result } = await recalculateItemInTransaction(tx, itemId, reason, changedItemIds[0] ?? null);
      impactRows.push({
        itemId,
        itemName: result.itemName,
        depth: impacted.get(itemId) ?? 0,
        beforeCost: before?.vl_custo_total ?? new Prisma.Decimal(0),
        afterCost: result.totalCost,
        deltaCost: result.totalCost.sub(before?.vl_custo_total ?? new Prisma.Decimal(0))
      });
    }

    return {
      order,
      impactRows
    };
  });
}

export async function previewCascadeImpact(
  tx: TransactionClient,
  changedItemId: string
) {
  const closureRows = await tx.dependenciaItem.findMany({
    where: {
      cd_item_descendente: changedItemId,
      nr_profundidade: { gt: 0 }
    },
    include: {
      itemAscendente: true
    },
    orderBy: [{ nr_profundidade: "asc" }, { cd_item_ascendente: "asc" }]
  });

  return Promise.all(
    closureRows.map(async (row) => {
      const snapshot = await tx.custoSnapshotItem.findFirst({
        where: { cd_item: row.cd_item_ascendente },
        orderBy: { ts_calculo: "desc" }
      });

      return {
        itemId: row.cd_item_ascendente,
        itemName: row.itemAscendente.nm_item,
        depth: row.nr_profundidade,
        currentCost: snapshot?.vl_custo_total ?? new Prisma.Decimal(0)
      };
    })
  );
}
