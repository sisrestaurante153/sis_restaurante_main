import { DomainInvariantError } from "@/modules/engineering/domain/errors";

export interface DirectCompositionEdge {
  parentItemId: string;
  childItemId: string;
}

export interface DependencyClosureRow {
  itemAscendenteId: string;
  itemDescendenteId: string;
  profundidade: number;
  relacaoDireta: boolean;
}

interface AssertCanAddComponentInput {
  itemResultanteId: string;
  itemComponenteId: string;
  closure: DependencyClosureRow[];
}

function buildAdjacency(edges: readonly DirectCompositionEdge[]) {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!adjacency.has(edge.parentItemId)) {
      adjacency.set(edge.parentItemId, new Set());
    }

    if (!adjacency.has(edge.childItemId)) {
      adjacency.set(edge.childItemId, new Set());
    }

    adjacency.get(edge.parentItemId)?.add(edge.childItemId);
  }

  return adjacency;
}

function assertAcyclicGraph(adjacency: Map<string, Set<string>>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string, trail: string[]) => {
    if (visiting.has(nodeId)) {
      throw new DomainInvariantError(
        `A composicao geraria ciclo: ${[...trail, nodeId].join(" -> ")}`
      );
    }

    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);

    for (const childId of adjacency.get(nodeId) ?? []) {
      visit(childId, [...trail, nodeId]);
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const nodeId of adjacency.keys()) {
    visit(nodeId, []);
  }
}

export function buildDependencyClosure(
  edges: readonly DirectCompositionEdge[]
): DependencyClosureRow[] {
  const adjacency = buildAdjacency(edges);
  assertAcyclicGraph(adjacency);

  const rows: DependencyClosureRow[] = [];

  for (const originId of adjacency.keys()) {
    const queue: Array<{ itemId: string; depth: number }> = [{ itemId: originId, depth: 0 }];
    const seen = new Map<string, number>([[originId, 0]]);

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      rows.push({
        itemAscendenteId: originId,
        itemDescendenteId: current.itemId,
        profundidade: current.depth,
        relacaoDireta: current.depth === 1
      });

      for (const childId of adjacency.get(current.itemId) ?? []) {
        const nextDepth = current.depth + 1;
        const knownDepth = seen.get(childId);

        if (knownDepth !== undefined && knownDepth <= nextDepth) {
          continue;
        }

        seen.set(childId, nextDepth);
        queue.push({ itemId: childId, depth: nextDepth });
      }
    }
  }

  return rows.sort((left, right) => {
    if (left.itemAscendenteId === right.itemAscendenteId) {
      if (left.profundidade === right.profundidade) {
        return left.itemDescendenteId.localeCompare(right.itemDescendenteId);
      }

      return left.profundidade - right.profundidade;
    }

    return left.itemAscendenteId.localeCompare(right.itemAscendenteId);
  });
}

export function assertCanAddComponent({
  itemResultanteId,
  itemComponenteId,
  closure
}: AssertCanAddComponentInput) {
  if (itemResultanteId === itemComponenteId) {
    throw new DomainInvariantError("Um item nao pode compor a si mesmo.");
  }

  const closesCycle = closure.some(
    (row) =>
      row.itemAscendenteId === itemComponenteId &&
      row.itemDescendenteId === itemResultanteId &&
      row.profundidade > 0
  );

  if (closesCycle) {
    throw new DomainInvariantError(
      `Adicionar o componente ${itemComponenteId} ao item ${itemResultanteId} geraria ciclo.`
    );
  }
}

export function getImpactedItems(
  itemId: string,
  closure: readonly DependencyClosureRow[]
): Array<{ itemId: string; profundidade: number }> {
  return closure
    .filter((row) => row.itemDescendenteId === itemId && row.profundidade > 0)
    .sort((left, right) => left.profundidade - right.profundidade)
    .map((row) => ({
      itemId: row.itemAscendenteId,
      profundidade: row.profundidade
    }));
}

export { DomainInvariantError } from "@/modules/engineering/domain/errors";
