import { describe, expect, it, vi } from "vitest";

vi.mock("@/generated/prisma/client", async () => {
  const Decimal = (await import("decimal.js")).default;
  return { Prisma: { Decimal } };
});

const { calculateItemCost, recalculateCascade } = await import("@/modules/engineering/domain/cost-engine");

// Helpers para montar grafos de teste
function leafNode(id: string, name: string, cost: string, unitType: "massa" | "volume" | "contagem" = "massa") {
  return { id, name, unitType, baseUnitCost: cost };
}

function compositeNode(
  id: string,
  name: string,
  components: { itemId: string; qty: string; unitType?: "massa" | "volume" | "contagem" }[],
  mode: "percentual_perda" | "peso_final" = "percentual_perda",
  percentualPerda = "0"
) {
  return {
    id,
    name,
    unitType: "massa" as const,
    ficha: {
      mode,
      percentualPerda,
      rendimentoPorcoes: null,
      components: components.map((c, i) => ({
        id: `comp-${id}-${i}`,
        itemId: c.itemId,
        componentType: "ingrediente" as const,
        quantityGross: c.qty,
        unitType: c.unitType ?? "massa"
      }))
    }
  };
}

describe("calculateItemCost — item folha (sem ficha)", () => {
  it("custo unitário direto sem componentes", () => {
    const graph = { frango: leafNode("frango", "Frango", "15") };
    const result = calculateItemCost(graph, "frango");
    expect(result.totalCost.toNumber()).toBe(15);
    expect(result.costPerKg.toNumber()).toBe(15);
    expect(result.components).toHaveLength(0);
  });

  it("custo zero quando baseUnitCost é zero", () => {
    const graph = { item: leafNode("item", "Item Grátis", "0") };
    const result = calculateItemCost(graph, "item");
    expect(result.totalCost.toNumber()).toBe(0);
  });
});

describe("calculateItemCost — item com ficha simples", () => {
  it("prato com 1 ingrediente sem perda: custo = qty × custo_unitário", () => {
    const graph = {
      frango: leafNode("frango", "Frango", "20"),
      prato: compositeNode("prato", "Prato de Frango", [{ itemId: "frango", qty: "0.3" }])
    };
    const result = calculateItemCost(graph, "prato");
    // 0.3kg × R$20/kg = R$6, sem perda peso_final=0.3
    expect(result.totalCost.toNumber()).toBeCloseTo(6, 4);
  });

  it("prato com 2 ingredientes: custo é a soma", () => {
    const graph = {
      frango: leafNode("frango", "Frango", "20"),
      arroz: leafNode("arroz", "Arroz", "5"),
      prato: compositeNode("prato", "Prato Completo", [
        { itemId: "frango", qty: "0.3" },
        { itemId: "arroz", qty: "0.2" }
      ])
    };
    const result = calculateItemCost(graph, "prato");
    // frango: 0.3×20=6, arroz: 0.2×5=1 → total=7
    expect(result.totalCost.toNumber()).toBeCloseTo(7, 4);
    expect(result.components).toHaveLength(2);
  });

  it("percentual de perda reduz o rendimento final e aumenta custo/kg", () => {
    const graph = {
      frango: leafNode("frango", "Frango", "10"),
      prato: compositeNode("prato", "Prato", [{ itemId: "frango", qty: "1" }], "percentual_perda", "0.2")
    };
    const result = calculateItemCost(graph, "prato");
    // 1kg × R$10 = R$10 total; rendimento = 1×(1-0.2) = 0.8kg
    // costPerKg = 10/0.8 = 12.5
    expect(result.totalCost.toNumber()).toBeCloseTo(10, 4);
    expect(result.costPerKg.toNumber()).toBeCloseTo(12.5, 4);
  });

  it("modo peso_final: usa o peso informado como saída", () => {
    const graph = {
      frango: leafNode("frango", "Frango", "10"),
      prato: {
        id: "prato",
        name: "Prato",
        unitType: "massa" as const,
        ficha: {
          mode: "peso_final" as const,
          pesoFinalInformado: "0.8",
          rendimentoPorcoes: null,
          components: [{
            id: "c1",
            itemId: "frango",
            componentType: "ingrediente" as const,
            quantityGross: "1",
            unitType: "massa" as const
          }]
        }
      }
    };
    const result = calculateItemCost(graph, "prato");
    expect(result.finalUsefulOutputQuantity.toNumber()).toBeCloseTo(0.8, 4);
    expect(result.costPerKg.toNumber()).toBeCloseTo(12.5, 4);
  });

  it("lança erro quando item não existe no grafo", () => {
    const graph = { frango: leafNode("frango", "Frango", "10") };
    expect(() => calculateItemCost(graph, "item-inexistente")).toThrow();
  });
});

describe("calculateItemCost — composição aninhada", () => {
  it("custo se propaga corretamente em 2 níveis", () => {
    const graph = {
      sal: leafNode("sal", "Sal", "2"),
      frango_temperado: compositeNode("frango_temperado", "Frango Temperado", [
        { itemId: "sal", qty: "0.01" }
      ]),
      prato: compositeNode("prato", "Prato Final", [
        { itemId: "frango_temperado", qty: "0.3" }
      ])
    };
    const resultado_ft = calculateItemCost(graph, "frango_temperado");
    const resultado_prato = calculateItemCost(graph, "prato");
    // frango_temperado: 0.01×2 = 0.02 total, rendimento=0.01kg, costPerKg=0.02/0.01=2
    // prato usa 0.3kg de frango_temperado: 0.3×2 = 0.6
    expect(resultado_prato.totalCost.toNumber()).toBeCloseTo(resultado_ft.costPerKg.toNumber() * 0.3, 4);
  });
});

describe("recalculateCascade", () => {
  it("calcula impacto em cascata quando custo de ingrediente muda", () => {
    const graph = {
      frango: leafNode("frango", "Frango", "20"),
      prato: compositeNode("prato", "Prato", [{ itemId: "frango", qty: "0.3" }])
    };

    const result = recalculateCascade(graph, [{ itemId: "frango", newBaseUnitCost: "30" }]);

    expect(result.recalculationOrder).toContain("frango");
    expect(result.recalculationOrder).toContain("prato");

    const impactFrango = result.impact.find((i) => i.itemId === "frango")!;
    expect(impactFrango.beforeCost.toNumber()).toBe(20);
    expect(impactFrango.afterCost.toNumber()).toBe(30);
    expect(impactFrango.deltaCost.toNumber()).toBe(10);

    const impactPrato = result.impact.find((i) => i.itemId === "prato")!;
    // antes: 0.3×20=6, depois: 0.3×30=9, delta=3
    expect(impactPrato.deltaCost.toNumber()).toBeCloseTo(3, 4);
  });

  it("delta zero quando custo não muda", () => {
    const graph = {
      frango: leafNode("frango", "Frango", "20"),
      prato: compositeNode("prato", "Prato", [{ itemId: "frango", qty: "0.3" }])
    };

    const result = recalculateCascade(graph, [{ itemId: "frango", newBaseUnitCost: "20" }]);
    const impact = result.impact.find((i) => i.itemId === "prato")!;
    expect(impact.deltaCost.toNumber()).toBe(0);
  });
});
