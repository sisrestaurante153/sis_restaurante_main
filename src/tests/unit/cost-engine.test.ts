import { describe, expect, it } from "vitest";
import {
  calculateItemCost,
  recalculateCascade,
  type CalculationGraph
} from "@/modules/engineering/domain/cost-engine";
import { DomainInvariantError } from "@/modules/engineering/domain/errors";

function decimalToNumber(value: { toNumber(): number } | null) {
  return value ? value.toNumber() : null;
}

function expectDecimal(value: { toNumber(): number }, expected: number, precision = 6) {
  expect(value.toNumber()).toBeCloseTo(expected, precision);
}

function buildGraph(): CalculationGraph {
  return {
    tomate: {
      id: "tomate",
      name: "Tomate",
      unitType: "massa",
      baseUnitCost: "10"
    },
    cebola: {
      id: "cebola",
      name: "Cebola",
      unitType: "massa",
      baseUnitCost: "6"
    },
    creme: {
      id: "creme",
      name: "Creme de leite",
      unitType: "massa",
      baseUnitCost: "20"
    },
    arroz: {
      id: "arroz",
      name: "Arroz Branco",
      unitType: "massa",
      baseUnitCost: "5"
    },
    feijaoBase: {
      id: "feijaoBase",
      name: "Feijao cozido",
      unitType: "massa",
      baseUnitCost: "8"
    },
    embalagemPrato: {
      id: "embalagemPrato",
      name: "Pote 1000ml",
      unitType: "contagem",
      baseUnitCost: "0.5"
    },
    embalagemMarmita: {
      id: "embalagemMarmita",
      name: "Marmita grande",
      unitType: "contagem",
      baseUnitCost: "1.2"
    },
    farofa: {
      id: "farofa",
      name: "Farofa",
      unitType: "massa",
      baseUnitCost: "8"
    },
    molhoPercentual: {
      id: "molhoPercentual",
      name: "Molho com perda",
      unitType: "massa",
      ficha: {
        mode: "percentual_perda",
        percentualPerda: "0.1",
        rendimentoPorcoes: "9",
        components: [
          {
            id: "c1",
            itemId: "tomate",
            componentType: "ingrediente",
            quantityGross: "2",
            quantityNet: "2",
            unitType: "massa"
          },
          {
            id: "c2",
            itemId: "cebola",
            componentType: "ingrediente",
            quantityGross: "1",
            quantityNet: "1",
            unitType: "massa"
          }
        ]
      }
    },
    molhoPesoFinal: {
      id: "molhoPesoFinal",
      name: "Molho peso final",
      unitType: "massa",
      ficha: {
        mode: "peso_final",
        pesoFinalInformado: "2.5",
        rendimentoPorcoes: "10",
        components: [
          {
            id: "c3",
            itemId: "tomate",
            componentType: "ingrediente",
            quantityGross: "2",
            quantityNet: "2",
            unitType: "massa"
          },
          {
            id: "c4",
            itemId: "creme",
            componentType: "ingrediente",
            quantityGross: "1",
            quantityNet: "1",
            unitType: "massa"
          }
        ]
      }
    },
    prato: {
      id: "prato",
      name: "Prato executivo",
      unitType: "massa",
      ficha: {
        mode: "peso_final",
        pesoFinalInformado: "0.5",
        rendimentoPorcoes: "1",
        components: [
          {
            id: "c5",
            itemId: "arroz",
            componentType: "ingrediente",
            quantityGross: "0.3",
            quantityNet: "0.3",
            unitType: "massa"
          },
          {
            id: "c6",
            itemId: "molhoPesoFinal",
            componentType: "ingrediente",
            quantityGross: "0.2",
            quantityNet: "0.2",
            unitType: "massa"
          },
          {
            id: "c7",
            itemId: "embalagemPrato",
            componentType: "embalagem",
            quantityGross: "1",
            quantityNet: "1",
            unitType: "contagem"
          }
        ]
      }
    },
    marmita: {
      id: "marmita",
      name: "Marmita executiva",
      unitType: "massa",
      ficha: {
        mode: "peso_final",
        pesoFinalInformado: "0.85",
        rendimentoPorcoes: "1",
        components: [
          {
            id: "c8",
            itemId: "arroz",
            componentType: "ingrediente",
            quantityGross: "0.2",
            quantityNet: "0.2",
            unitType: "massa"
          },
          {
            id: "c9",
            itemId: "feijaoBase",
            componentType: "ingrediente",
            quantityGross: "0.2",
            quantityNet: "0.2",
            unitType: "massa"
          },
          {
            id: "c10",
            itemId: "molhoPesoFinal",
            componentType: "ingrediente",
            quantityGross: "0.25",
            quantityNet: "0.25",
            unitType: "massa"
          },
          {
            id: "c11",
            itemId: "farofa",
            componentType: "apoio",
            quantityGross: "0.15",
            quantityNet: "0.15",
            unitType: "massa"
          },
          {
            id: "c12",
            itemId: "embalagemMarmita",
            componentType: "embalagem",
            quantityGross: "1",
            quantityNet: "1",
            unitType: "contagem"
          }
        ]
      }
    }
  };
}

describe("cost engine", () => {
  it("calculates a simple input item without loss", () => {
    const result = calculateItemCost(buildGraph(), "tomate");

    expectDecimal(result.totalCost, 10);
    expectDecimal(result.directCost, 10);
    expectDecimal(result.inheritedCost, 0);
    expectDecimal(result.finalUsefulOutputQuantity, 1);
    expectDecimal(result.costPerKg, 10);
    expectDecimal(result.costPerFinalItem, 10);
  });

  it("calculates recipe cost with percentual loss", () => {
    const result = calculateItemCost(buildGraph(), "molhoPercentual");

    expectDecimal(result.totalCost, 26);
    expectDecimal(result.finalUsefulOutputQuantity, 2.7);
    expectDecimal(result.costPerKg, 26 / 2.7);
    expectDecimal(result.costPerPortion!, 26 / 9);
    expectDecimal(result.directCost, 26);
    expectDecimal(result.inheritedCost, 0);
    expectDecimal(result.components[0].factorCorrecaoEquivalente, 1);
    expectDecimal(result.components[0].indiceCoccaoEquivalente!, 2.7 / 2);
  });

  it("calculates recipe cost with informed final weight", () => {
    const result = calculateItemCost(buildGraph(), "molhoPesoFinal");

    expectDecimal(result.totalCost, 40);
    expectDecimal(result.finalUsefulOutputQuantity, 2.5);
    expectDecimal(result.costPerKg, 16);
    expectDecimal(result.costPerPortion!, 4);
    expectDecimal(result.components[0].indiceCoccaoEquivalente!, 1.25);
  });

  it("calculates a plate with inherited item and packaging cost", () => {
    const result = calculateItemCost(buildGraph(), "prato");

    expectDecimal(result.totalCost, 5.2);
    expectDecimal(result.directCost, 2);
    expectDecimal(result.inheritedCost, 3.2);
    expectDecimal(result.costPerKg, 10.4);
    expect(result.expandedBreakdown.some((row) => row.path === "Molho peso final > Tomate")).toBe(true);

    const tomatoContribution = result.expandedBreakdown.find(
      (row) => row.path === "Molho peso final > Tomate"
    );
    expectDecimal(tomatoContribution!.totalCost, 1.6);
  });

  it("calculates a marmita with multiple components", () => {
    const result = calculateItemCost(buildGraph(), "marmita");

    expectDecimal(result.totalCost, 9);
    expectDecimal(result.directCost, 5);
    expectDecimal(result.inheritedCost, 4);
    expectDecimal(result.costPerKg, 9 / 0.85);
    expectDecimal(result.costPerFinalItem, 9);
  });

  it("recalculates the full affected chain after an input price change", () => {
    const recalculated = recalculateCascade(buildGraph(), [
      {
        itemId: "tomate",
        newBaseUnitCost: "12"
      }
    ]);

    expect(recalculated.recalculationOrder).toEqual([
      "tomate",
      "molhoPercentual",
      "molhoPesoFinal",
      "marmita",
      "prato"
    ]);

    expectDecimal(recalculated.after.get("molhoPesoFinal")!.totalCost, 44);
    expectDecimal(recalculated.after.get("prato")!.totalCost, 5.52);
    expectDecimal(recalculated.after.get("marmita")!.totalCost, 9.4);

    const impactOnMarmita = recalculated.impact.find((row) => row.itemId === "marmita");
    expectDecimal(impactOnMarmita!.deltaCost, 0.4);
    expect(impactOnMarmita!.depth).toBe(2);
  });

  it("blocks cyclic compositions", () => {
    const graph = buildGraph();
    graph.molhoPesoFinal.ficha!.components.push({
      id: "cycle",
      itemId: "prato",
      componentType: "ingrediente",
      quantityGross: "0.1",
      quantityNet: "0.1",
      unitType: "massa"
    });

    expect(() => calculateItemCost(graph, "prato")).toThrow(DomainInvariantError);
  });

  it("exposes impact visualization with previous and next costs", () => {
    const recalculated = recalculateCascade(buildGraph(), [
      {
        itemId: "tomate",
        newBaseUnitCost: "12"
      }
    ]);

    const plateImpact = recalculated.impact.find((row) => row.itemId === "prato");
    expect(decimalToNumber(plateImpact!.beforeCost)).toBeCloseTo(5.2, 6);
    expect(decimalToNumber(plateImpact!.afterCost)).toBeCloseTo(5.52, 6);
  });
});
