import type { PrismaClient } from "@/generated/prisma/client";
import { FichaStatus, Prisma } from "@/generated/prisma/client";
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
    where: { id: itemId },
    include: {
      unidadeUsoPadrao: true,
      custosSnapshot: {
        orderBy: { calculadoEm: "desc" },
        take: 1
      },
      compras: {
        orderBy: [{ dataAtualizacaoPreco: "desc" }, { criadoEm: "desc" }],
        take: 1
      },
      fichasResultantes: {
        where: { status: FichaStatus.ativa },
        orderBy: { versao: "desc" },
        take: 1,
        include: {
          componentes: {
            orderBy: { ordem: "asc" },
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
    graph[item.id] = {
      id: item.id,
      name: item.nome,
      unitType: activeFicha
        ? "massa"
        : item.unidadeUsoPadrao?.tipo === "contagem"
          ? "contagem"
          : "massa",
      baseUnitCost: activeFicha
        ? item.custosSnapshot[0]?.custoPorKgOuUnidadeUso?.toString() ??
          item.compras[0]?.custoUnitarioBase.toString() ??
          "0"
        : item.compras[0]?.custoUnitarioBase.toString() ??
          item.custosSnapshot[0]?.custoPorKgOuUnidadeUso?.toString() ??
          "0",
      ficha: activeFicha
        ? {
            mode: activeFicha.modoRendimento,
            percentualPerda: activeFicha.percentualPerda?.toString(),
            pesoFinalInformado: activeFicha.pesoFinalInformado?.toString(),
            rendimentoPorcoes: activeFicha.rendimentoPorcoes?.toString(),
            components: activeFicha.componentes.map((component) => ({
              id: component.id,
              itemId: component.itemComponenteId,
              componentType: component.tipoComponente,
              quantityGross: normalizeQuantityToCanonical(
                component.quantidadeBruta.toString(),
                component.unidadeUso.codigo
              ).toString(),
              quantityNet: component.quantidadeLimpa
                ? normalizeQuantityToCanonical(
                    component.quantidadeLimpa.toString(),
                    component.unidadeUso.codigo
                  ).toString()
                : null,
              unitType:
                component.unidadeUso.tipo === "contagem"
                  ? "contagem"
                  : component.unidadeUso.tipo === "volume"
                    ? "volume"
                    : "massa",
              correctionFactor: component.fatorCorrecao?.toString() ?? null,
              cookingIndex: component.indiceCoccao?.toString() ?? null
            }))
          }
        : undefined
    };

    for (const component of activeFicha?.componentes ?? []) {
      queue.push(component.itemComponenteId);
    }
  }

  return graph;
}

async function loadAllActiveEdges(tx: TransactionClient): Promise<DirectCompositionEdge[]> {
  const fichas = await tx.fichaTecnica.findMany({
    where: { status: FichaStatus.ativa },
    select: {
      itemResultanteId: true,
      componentes: {
        select: {
          itemComponenteId: true
        }
      }
    }
  });

  return fichas.flatMap((ficha) =>
    ficha.componentes.map((component) => ({
      parentItemId: ficha.itemResultanteId,
      childItemId: component.itemComponenteId
    }))
  );
}

export async function assertNoCyclesBeforeSaving(
  tx: TransactionClient,
  itemResultanteId: string,
  componentItemIds: readonly string[]
) {
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
        itemAscendenteId: row.itemAscendenteId,
        itemDescendenteId: row.itemDescendenteId,
        profundidade: row.profundidade,
        relacaoDireta: row.relacaoDireta
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
      itemResultanteId: result.itemId,
      status: FichaStatus.ativa
    },
    orderBy: { versao: "desc" }
  });

  const latestSnapshot = await tx.custoSnapshotItem.findFirst({
    where: { itemId: result.itemId },
    orderBy: { calculadoEm: "desc" }
  });

  const execution = await tx.calculoExecucao.create({
    data: {
      itemId: result.itemId,
      fichaTecnicaId: activeFicha?.id ?? null,
      itemGatilhoId: triggerItemId ?? null,
      motivo: reason,
      custoAnterior: latestSnapshot?.custoTotalAtual ?? null,
      custoNovo: result.totalCost.toString(),
      quantidadeSaida: result.finalUsefulOutputQuantity.toString(),
      metadadosJson: normalizeJson(serializeCalculatedItem(result))
    }
  });

  for (const component of result.components) {
    await tx.calculoComponenteSnapshot.create({
      data: {
        calculoExecucaoId: execution.id,
        fichaComponenteId: component.componentId,
        itemComponenteId: component.componentItemId,
        caminho: component.componentName,
        profundidade: 1,
        tipoComponente: component.componentType,
        quantidadeBruta: component.quantityGross.toString(),
        quantidadeLiquida: component.quantityNet.toString(),
        fatorCorrecaoEquivalente: component.factorCorrecaoEquivalente.toString(),
        indiceCoccaoEquivalente: component.indiceCoccaoEquivalente?.toString() ?? null,
        custoDireto: component.directCost.toString(),
        custoHerdado: component.inheritedCost.toString(),
        custoTotal: component.totalCost.toString(),
        percentualImpacto: result.totalCost.equals(0)
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
      itemId: result.itemId,
      calculoExecucaoId: execution.id,
      custoUnitarioAtual:
        result.unitType === "contagem"
          ? result.costPerFinalItem.toString()
          : result.costPerKg.toString(),
      custoPorKgOuUnidadeUso:
        result.unitType === "contagem"
          ? result.costPerFinalItem.toString()
          : result.costPerKg.toString(),
      custoEmbalagemAtual: packagingCost.toString(),
      custoTotalAtual: result.totalCost.toString(),
      origemRecalculo: reason
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
        itemDescendenteId: { in: [...changedItemIds] }
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
      if (row.profundidade === 0) {
        continue;
      }

      const current = impacted.get(row.itemAscendenteId);
      if (current === undefined || row.profundidade < current) {
        impacted.set(row.itemAscendenteId, row.profundidade);
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
        where: { itemId },
        orderBy: { calculadoEm: "desc" }
      });

      const { result } = await recalculateItemInTransaction(tx, itemId, reason, changedItemIds[0] ?? null);
      impactRows.push({
        itemId,
        itemName: result.itemName,
        depth: impacted.get(itemId) ?? 0,
        beforeCost: before?.custoTotalAtual ?? new Prisma.Decimal(0),
        afterCost: result.totalCost,
        deltaCost: result.totalCost.sub(before?.custoTotalAtual ?? new Prisma.Decimal(0))
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
      itemDescendenteId: changedItemId,
      profundidade: { gt: 0 }
    },
    include: {
      itemAscendente: true
    },
    orderBy: [{ profundidade: "asc" }, { itemAscendenteId: "asc" }]
  });

  return Promise.all(
    closureRows.map(async (row) => {
      const snapshot = await tx.custoSnapshotItem.findFirst({
        where: { itemId: row.itemAscendenteId },
        orderBy: { calculadoEm: "desc" }
      });

      return {
        itemId: row.itemAscendenteId,
        itemName: row.itemAscendente.nome,
        depth: row.profundidade,
        currentCost: snapshot?.custoTotalAtual ?? new Prisma.Decimal(0)
      };
    })
  );
}
