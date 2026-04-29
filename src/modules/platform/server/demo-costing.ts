import "server-only";
import { Prisma } from "@/generated/prisma/client";
import {
  calculateItemCost,
  type CalculatedItemCost,
  type CalculationGraph
} from "@/modules/engineering/domain/cost-engine";
import type {
  DemoComponentRecord,
  DemoExpandedRow,
  DemoFichaRecord,
  DemoItemRecord,
  DemoStore
} from "@/modules/platform/server/demo-data";

const UNIT_FACTORS: Record<string, { type: "massa" | "volume" | "contagem"; factor: number }> = {
  kg: { type: "massa", factor: 1 },
  g: { type: "massa", factor: 0.001 },
  mg: { type: "massa", factor: 0.000001 },
  l: { type: "volume", factor: 1 },
  ml: { type: "volume", factor: 0.001 },
  un: { type: "contagem", factor: 1 }
};

function decimalToFixed(value: Prisma.Decimal | number, precision = 4) {
  const decimal = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return decimal.toFixed(precision);
}

function normalizeUnit(code: string) {
  return code.trim().toLowerCase();
}

function resolveUnit(code: string) {
  return UNIT_FACTORS[normalizeUnit(code)] ?? { type: "contagem" as const, factor: 1 };
}

function normalizeQuantity(value: string, unitCode: string) {
  const unit = resolveUnit(unitCode);
  return new Prisma.Decimal(value || "0").mul(unit.factor);
}

function inferItemBaseCost(item: DemoItemRecord) {
  const purchaseQuantity = normalizeQuantity(item.purchaseQuantity || "1", item.purchaseUnit || item.usageUnit);
  if (purchaseQuantity.lte(0)) {
    return "0";
  }

  return new Prisma.Decimal(item.purchaseCost || "0").div(purchaseQuantity).toString();
}

function buildActiveFichaMap(store: DemoStore) {
  const map = new Map<string, DemoFichaRecord>();

  for (const ficha of store.fichas) {
    if (ficha.status !== "ativa") {
      continue;
    }

    const current = map.get(ficha.itemId);
    if (!current || ficha.version > current.version) {
      map.set(ficha.itemId, ficha);
    }
  }

  return map;
}

function buildGraph(store: DemoStore): CalculationGraph {
  const activeFichas = buildActiveFichaMap(store);

  return Object.fromEntries(
    store.items.map((item) => {
      const activeFicha = activeFichas.get(item.id);

      return [
        item.id,
        {
          id: item.id,
          name: item.name,
          unitType: resolveUnit(item.usageUnit).type,
          baseUnitCost: inferItemBaseCost(item),
          ficha: activeFicha
            ? {
                mode: activeFicha.yieldMode,
                percentualPerda: activeFicha.percentLoss,
                pesoFinalInformado: activeFicha.finalWeight,
                rendimentoPorcoes: activeFicha.portions,
                components: activeFicha.components.map((component) => ({
                  id: component.id,
                  itemId: component.itemId,
                  componentType: component.componentType,
                  quantityGross: normalizeQuantity(component.quantityGross, component.usageUnit).toString(),
                  quantityNet: normalizeQuantity(component.quantityNet, component.usageUnit).toString(),
                  unitType: resolveUnit(component.usageUnit).type
                }))
              }
            : undefined
        }
      ];
    })
  );
}

function buildExpandedRows(
  itemName: string,
  store: DemoStore,
  result: CalculatedItemCost
): DemoExpandedRow[] {
  return result.expandedBreakdown.map((row, index) => {
    const item = store.items.find((entry) => entry.id === row.itemId);
    const path = `${itemName} > ${row.path}`;

    return {
      id: `exp-${result.itemId}-${index}`,
      path,
      depth: Math.max(1, row.path.split(" > ").length),
      itemName: row.itemName,
      componentType:
        item?.type === "embalagem" ? "embalagem" : item?.type === "apoio" ? "apoio" : "ingrediente",
      usageUnit: item?.usageUnit ?? "un",
      quantity: "n/a",
      totalCost: decimalToFixed(row.totalCost)
    };
  });
}

function applyComponentCosts(
  components: DemoComponentRecord[],
  result: CalculatedItemCost
): DemoComponentRecord[] {
  const mapped = new Map(result.components.map((component) => [component.componentId, component]));

  return components.map((component) => {
    const calculated = mapped.get(component.id);

    if (!calculated) {
      return component;
    }

    return {
      ...component,
      directCost: decimalToFixed(calculated.directCost),
      inheritedCost: decimalToFixed(calculated.inheritedCost),
      totalCost: decimalToFixed(calculated.totalCost),
      impactPercent: result.totalCost.gt(0)
        ? decimalToFixed(calculated.totalCost.div(result.totalCost), 4)
        : "0.0000"
    };
  });
}

function applyItemCost(item: DemoItemRecord, result: CalculatedItemCost, timestamp: string) {
  const packagingCost = result.components
    .filter((component) => component.componentType !== "ingrediente")
    .reduce((sum, component) => sum.add(component.totalCost), new Prisma.Decimal(0));

  item.costs.direct = decimalToFixed(result.directCost);
  item.costs.inherited = decimalToFixed(result.inheritedCost);
  item.costs.packaging = decimalToFixed(packagingCost);
  item.costs.total = decimalToFixed(result.totalCost);
  item.lastCalculationAt = timestamp;
}

function applyFichaCost(store: DemoStore, ficha: DemoFichaRecord, result: CalculatedItemCost, timestamp: string) {
  ficha.itemName = store.items.find((item) => item.id === ficha.itemId)?.name ?? ficha.itemName;
  ficha.itemType = store.items.find((item) => item.id === ficha.itemId)?.type ?? ficha.itemType;
  ficha.updatedAt = timestamp;
  ficha.components = applyComponentCosts(ficha.components, result);
  ficha.expandedRows = buildExpandedRows(ficha.itemName, store, result);

  const packagingCost = result.components
    .filter((component) => component.componentType !== "ingrediente")
    .reduce((sum, component) => sum.add(component.totalCost), new Prisma.Decimal(0));

  ficha.costs = {
    direct: decimalToFixed(result.directCost),
    inherited: decimalToFixed(result.inheritedCost),
    packaging: decimalToFixed(packagingCost),
    total: decimalToFixed(result.totalCost),
    perKg: decimalToFixed(result.costPerKg),
    perPortion: result.costPerPortion ? decimalToFixed(result.costPerPortion) : null,
    finalOutput: decimalToFixed(result.finalUsefulOutputQuantity)
  };
}

export function recalculateDemoStoreCosts(store: DemoStore) {
  const graph = buildGraph(store);
  const timestamp = new Date().toISOString();
  const activeFichas = buildActiveFichaMap(store);

  for (const item of store.items) {
    const result = calculateItemCost(graph, item.id);
    applyItemCost(item, result, timestamp);

    const activeFicha = activeFichas.get(item.id);
    if (activeFicha) {
      applyFichaCost(store, activeFicha, result, timestamp);
      item.fichaStatus = activeFicha.status;
    } else {
      item.fichaStatus = null;
    }
  }

  return store;
}
