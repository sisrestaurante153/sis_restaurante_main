import { Prisma } from "@/generated/prisma/client";
import {
  buildDependencyClosure,
  getImpactedItems,
  type DirectCompositionEdge
} from "@/modules/engineering/domain/composition";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

type UnitType = "massa" | "volume" | "contagem";
type ComponentType = "ingrediente" | "embalagem" | "apoio";
type YieldMode = "percentual_perda" | "peso_final";

export interface CalculationComponentInput {
  id: string;
  itemId: string;
  componentType: ComponentType;
  quantityGross: string;
  quantityNet?: string | null;
  unitType: UnitType;
  correctionFactor?: string | null;
  cookingIndex?: string | null;
}

export interface CalculationRecipeInput {
  mode: YieldMode;
  percentualPerda?: string | null;
  pesoFinalInformado?: string | null;
  rendimentoPorcoes?: string | null;
  components: CalculationComponentInput[];
}

export interface CalculationNodeInput {
  id: string;
  name: string;
  unitType: UnitType;
  baseUnitCost?: string | null;
  ficha?: CalculationRecipeInput;
}

export type CalculationGraph = Record<string, CalculationNodeInput>;

export interface ComponentCostBreakdown {
  componentId: string;
  componentItemId: string;
  componentName: string;
  componentType: ComponentType;
  quantityGross: Prisma.Decimal;
  quantityNet: Prisma.Decimal;
  factorCorrecaoEquivalente: Prisma.Decimal;
  indiceCoccaoEquivalente: Prisma.Decimal | null;
  directCost: Prisma.Decimal;
  inheritedCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
}

export interface ExpandedCostBreakdown {
  itemId: string;
  itemName: string;
  path: string;
  totalCost: Prisma.Decimal;
}

export interface CalculatedItemCost {
  itemId: string;
  itemName: string;
  unitType: UnitType;
  finalUsefulOutputQuantity: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  directCost: Prisma.Decimal;
  inheritedCost: Prisma.Decimal;
  costPerKg: Prisma.Decimal;
  costPerPortion: Prisma.Decimal | null;
  costPerFinalItem: Prisma.Decimal;
  components: ComponentCostBreakdown[];
  expandedBreakdown: ExpandedCostBreakdown[];
}

export interface CostOverride {
  itemId: string;
  newBaseUnitCost: string;
}

export interface ImpactRow {
  itemId: string;
  itemName: string;
  depth: number;
  beforeCost: Prisma.Decimal;
  afterCost: Prisma.Decimal;
  deltaCost: Prisma.Decimal;
}

export interface CascadeRecalculationResult {
  recalculationOrder: string[];
  before: Map<string, CalculatedItemCost>;
  after: Map<string, CalculatedItemCost>;
  impact: ImpactRow[];
}

const ZERO = new Prisma.Decimal(0);
const ONE = new Prisma.Decimal(1);

function decimal(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return ZERO;
  }

  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function assertGraphNode(graph: CalculationGraph, itemId: string) {
  const node = graph[itemId];

  if (!node) {
    throw new DomainInvariantError(`Item ${itemId} nao encontrado no grafo de calculo.`);
  }

  return node;
}

function buildGraphEdges(graph: CalculationGraph): DirectCompositionEdge[] {
  const edges: DirectCompositionEdge[] = [];

  for (const node of Object.values(graph)) {
    for (const component of node.ficha?.components ?? []) {
      edges.push({
        parentItemId: node.id,
        childItemId: component.itemId
      });
    }
  }

  return edges;
}

function inferQuantityNet(component: CalculationComponentInput) {
  if (component.quantityNet) {
    return decimal(component.quantityNet);
  }

  if (component.correctionFactor) {
    return decimal(component.quantityGross).div(decimal(component.correctionFactor));
  }

  return decimal(component.quantityGross);
}

function inferFactorCorrecao(component: CalculationComponentInput, quantityNet: Prisma.Decimal) {
  if (component.correctionFactor) {
    return decimal(component.correctionFactor);
  }

  if (quantityNet.equals(0)) {
    return ONE;
  }

  return decimal(component.quantityGross).div(quantityNet);
}

function inferFinalUsefulOutput(
  node: CalculationNodeInput,
  weightBearingNetInput: Prisma.Decimal
): Prisma.Decimal {
  if (!node.ficha) {
    return ONE;
  }

  if (node.ficha.mode === "peso_final") {
    return decimal(node.ficha.pesoFinalInformado);
  }

  return weightBearingNetInput.mul(ONE.sub(decimal(node.ficha.percentualPerda)));
}

function selectUsageRate(result: CalculatedItemCost, unitType: UnitType) {
  if (unitType === "contagem") {
    return result.costPerFinalItem;
  }

  return result.costPerKg;
}

function sortExpandedBreakdown(rows: ExpandedCostBreakdown[]) {
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}

function calculateNode(
  graph: CalculationGraph,
  itemId: string,
  cache: Map<string, CalculatedItemCost>
): CalculatedItemCost {
  const cached = cache.get(itemId);
  if (cached) {
    return cached;
  }

  const node = assertGraphNode(graph, itemId);

  if (!node.ficha) {
    const unitCost = decimal(node.baseUnitCost);
    const result: CalculatedItemCost = {
      itemId: node.id,
      itemName: node.name,
      unitType: node.unitType,
      finalUsefulOutputQuantity: ONE,
      totalCost: unitCost,
      directCost: unitCost,
      inheritedCost: ZERO,
      costPerKg: unitCost,
      costPerPortion: null,
      costPerFinalItem: unitCost,
      components: [],
      expandedBreakdown: [
        {
          itemId: node.id,
          itemName: node.name,
          path: node.name,
          totalCost: unitCost
        }
      ]
    };

    cache.set(itemId, result);
    return result;
  }

  let weightBearingNetInput = ZERO;
  const components: ComponentCostBreakdown[] = [];
  let totalCost = ZERO;
  let directCost = ZERO;
  let inheritedCost = ZERO;

  for (const component of node.ficha.components) {
    const componentNode = assertGraphNode(graph, component.itemId);
    const childCost = calculateNode(graph, component.itemId, cache);
    const quantityGross = decimal(component.quantityGross);
    const quantityNet = inferQuantityNet(component);
    const factorCorrecaoEquivalente = inferFactorCorrecao(component, quantityNet);
    const usageRate = selectUsageRate(childCost, component.unitType);
    const totalComponentCost = usageRate.mul(quantityNet);
    const inheritedComponentCost = componentNode.ficha ? totalComponentCost : ZERO;
    const directComponentCost = componentNode.ficha ? ZERO : totalComponentCost;

    totalCost = totalCost.add(totalComponentCost);
    directCost = directCost.add(directComponentCost);
    inheritedCost = inheritedCost.add(inheritedComponentCost);

    if (component.unitType !== "contagem") {
      weightBearingNetInput = weightBearingNetInput.add(quantityNet);
    }

    components.push({
      componentId: component.id,
      componentItemId: componentNode.id,
      componentName: componentNode.name,
      componentType: component.componentType,
      quantityGross,
      quantityNet,
      factorCorrecaoEquivalente,
      indiceCoccaoEquivalente: null,
      directCost: directComponentCost,
      inheritedCost: inheritedComponentCost,
      totalCost: totalComponentCost
    });
  }

  const finalUsefulOutputQuantity = inferFinalUsefulOutput(node, weightBearingNetInput);
  if (finalUsefulOutputQuantity.lte(0)) {
    throw new DomainInvariantError(`O item ${node.name} possui peso util final invalido.`);
  }

  const costPerKg = totalCost.div(finalUsefulOutputQuantity);
  const costPerFinalItem = totalCost;
  const costPerPortion = node.ficha.rendimentoPorcoes
    ? totalCost.div(decimal(node.ficha.rendimentoPorcoes))
    : null;

  const expandedBreakdown: ExpandedCostBreakdown[] = [];

  for (const component of components) {
    component.indiceCoccaoEquivalente =
      component.quantityNet.gt(0) && component.componentType !== "embalagem"
        ? finalUsefulOutputQuantity.div(component.quantityNet)
        : null;

    const componentNode = assertGraphNode(graph, component.componentItemId);
    if (!componentNode.ficha) {
      expandedBreakdown.push({
        itemId: component.componentItemId,
        itemName: component.componentName,
        path: component.componentName,
        totalCost: component.totalCost
      });
      continue;
    }

    const childCost = calculateNode(graph, component.componentItemId, cache);
    if (childCost.totalCost.equals(0)) {
      expandedBreakdown.push({
        itemId: component.componentItemId,
        itemName: component.componentName,
        path: component.componentName,
        totalCost: component.totalCost
      });
      continue;
    }

    const multiplier = component.totalCost.div(childCost.totalCost);
    for (const row of childCost.expandedBreakdown) {
      expandedBreakdown.push({
        itemId: row.itemId,
        itemName: row.itemName,
        path: `${component.componentName} > ${row.path}`,
        totalCost: row.totalCost.mul(multiplier)
      });
    }
  }

  const result: CalculatedItemCost = {
    itemId: node.id,
    itemName: node.name,
    unitType: node.unitType,
    finalUsefulOutputQuantity,
    totalCost,
    directCost,
    inheritedCost,
    costPerKg,
    costPerPortion,
    costPerFinalItem,
    components,
    expandedBreakdown: sortExpandedBreakdown(expandedBreakdown)
  };

  cache.set(itemId, result);
  return result;
}

function cloneGraphWithOverrides(graph: CalculationGraph, overrides: readonly CostOverride[]) {
  const cloned: CalculationGraph = structuredClone(graph);

  for (const override of overrides) {
    const node = assertGraphNode(cloned, override.itemId);
    node.baseUnitCost = override.newBaseUnitCost;
  }

  return cloned;
}

export function calculateItemCost(graph: CalculationGraph, itemId: string): CalculatedItemCost {
  buildDependencyClosure(buildGraphEdges(graph));
  return calculateNode(graph, itemId, new Map());
}

export function recalculateCascade(
  graph: CalculationGraph,
  overrides: readonly CostOverride[]
): CascadeRecalculationResult {
  const edges = buildGraphEdges(graph);
  const closure = buildDependencyClosure(edges);
  const affected = new Map<string, number>();

  for (const override of overrides) {
    affected.set(override.itemId, 0);
    for (const impact of getImpactedItems(override.itemId, closure)) {
      const knownDepth = affected.get(impact.itemId);
      if (knownDepth === undefined || impact.profundidade < knownDepth) {
        affected.set(impact.itemId, impact.profundidade);
      }
    }
  }

  const recalculationOrder = [...affected.entries()]
    .sort((left, right) => {
      if (left[1] === right[1]) {
        return left[0].localeCompare(right[0]);
      }

      return left[1] - right[1];
    })
    .map(([itemId]) => itemId);

  const before = new Map<string, CalculatedItemCost>();
  for (const itemId of recalculationOrder) {
    before.set(itemId, calculateItemCost(graph, itemId));
  }

  const afterGraph = cloneGraphWithOverrides(graph, overrides);
  const after = new Map<string, CalculatedItemCost>();
  for (const itemId of recalculationOrder) {
    after.set(itemId, calculateItemCost(afterGraph, itemId));
  }

  const impact = recalculationOrder.map((itemId) => {
    const previous = before.get(itemId)!;
    const next = after.get(itemId)!;
    return {
      itemId,
      itemName: next.itemName,
      depth: affected.get(itemId) ?? 0,
      beforeCost: previous.totalCost,
      afterCost: next.totalCost,
      deltaCost: next.totalCost.sub(previous.totalCost)
    };
  });

  return {
    recalculationOrder,
    before,
    after,
    impact
  };
}
