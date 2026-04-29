import { beforeEach, describe, expect, it } from "vitest";
import {
  getEngineeringRepository,
  resetEngineeringRepositoryForTests
} from "@/modules/engineering/server/engineering-repository";

describe("engineering repository", () => {
  beforeEach(() => {
    resetEngineeringRepositoryForTests();
  });

  it("duplicates an existing ficha with incremented version", async () => {
    const repository = getEngineeringRepository();
    const before = await repository.getFichaDetail("ficha-molho-v1");

    expect(before?.version).toBe(1);

    const duplicated = await repository.duplicateFicha("ficha-molho-v1");

    expect(duplicated.version).toBe(2);
    expect(duplicated.status).toBe("rascunho");
    expect(duplicated.components).toHaveLength(before?.components.length ?? 0);
  });

  it("inactivates a ficha and keeps it visible in the listing", async () => {
    const repository = getEngineeringRepository();

    await repository.inactivateFicha("ficha-prato-v3");

    const result = await repository.listFichas({
      page: 1,
      pageSize: 10,
      query: "",
      status: "all"
    });

    const ficha = result.items.find((item) => item.id === "ficha-prato-v3");

    expect(ficha?.status).toBe("inativa");
  });

  it("keeps commercial calculations local to the current ficha", async () => {
    const repository = getEngineeringRepository();

    await repository.saveFicha({
      id: "ficha-molho-v1",
      itemId: "item-molho",
      displayName: "Molho Base de Tomate",
      itemType: "pre_preparo",
      groupOperational: "Pre-preparo",
      modalityId: "mod-producao",
      yieldUnitCode: "kg",
      status: "ativa",
      yieldMode: "percentual_perda",
      percentLoss: "0.1200",
      finalWeight: null,
      portions: "12.0000",
      salePrice: "45.0000",
      variableExpensePercent: "0.1000",
      preparationMode: "Refogar, reduzir e resfriar.",
      notes: "Receita de referencia para pratos e marmitas.",
      stages: [
        {
          id: "stage-molho-1",
          name: "Preparo",
          outputQuantity: "2.4500",
          correctionFactor: "1.000000",
          cookingIndex: "1.000000",
          notes: "",
          items: [
            {
              itemId: "item-tomate",
              componentType: "ingrediente",
              quantityUsed: "2.0000",
              usageUnit: "kg"
            },
            {
              itemId: "item-cebola",
              componentType: "ingrediente",
              quantityUsed: "0.5000",
              usageUnit: "kg"
            }
          ]
        }
      ],
      components: [
        {
          itemId: "item-tomate",
          componentType: "ingrediente",
          quantityGross: "2.0000",
          quantityNet: "2.0000",
          usageUnit: "kg"
        },
        {
          itemId: "item-cebola",
          componentType: "ingrediente",
          quantityGross: "0.5000",
          quantityNet: "0.4500",
          usageUnit: "kg"
        }
      ]
    });

    const pratoAntes = await repository.getFichaDetail("ficha-prato-v3");

    expect(pratoAntes?.sheetSummary.salePrice).toBe("--");
    expect(pratoAntes?.sheetSummary.variableExpensePercent).toBe("--");

    const pratoDepois = await repository.saveFicha({
      id: "ficha-prato-v3",
      itemId: "item-prato",
      displayName: "Prato Executivo Frango",
      itemType: "prato",
      groupOperational: "Montagem",
      modalityId: "mod-salao",
      yieldUnitCode: "un",
      status: "ativa",
      yieldMode: "peso_final",
      percentLoss: null,
      finalWeight: "0.5400",
      portions: "1.0000",
      salePrice: "87.9000",
      variableExpensePercent: "0.1500",
      preparationMode: "Montagem final em bancada quente.",
      notes: "Versao operacional para salao e take-away.",
      stages: [
        {
          id: "stage-prato-1",
          name: "Montagem",
          outputQuantity: "0.5400",
          correctionFactor: "1.000000",
          cookingIndex: "1.000000",
          notes: "",
          items: [
            {
              itemId: "item-arroz",
              componentType: "ingrediente",
              quantityUsed: "0.1800",
              usageUnit: "kg"
            },
            {
              itemId: "item-molho",
              componentType: "ingrediente",
              quantityUsed: "0.2200",
              usageUnit: "kg"
            },
            {
              itemId: "item-embalagem-prato",
              componentType: "embalagem",
              quantityUsed: "1.0000",
              usageUnit: "un"
            }
          ]
        }
      ],
      components: [
        {
          itemId: "item-arroz",
          componentType: "ingrediente",
          quantityGross: "0.1800",
          quantityNet: "0.1800",
          usageUnit: "kg"
        },
        {
          itemId: "item-molho",
          componentType: "ingrediente",
          quantityGross: "0.2200",
          quantityNet: "0.2200",
          usageUnit: "kg"
        },
        {
          itemId: "item-embalagem-prato",
          componentType: "embalagem",
          quantityGross: "1.0000",
          quantityNet: "1.0000",
          usageUnit: "un"
        }
      ]
    });

    expect(pratoDepois?.sheetSummary.salePrice).toBe("87.9000");
    expect(pratoDepois?.sheetSummary.variableExpensePercent).toBe("0.1500");
    expect(pratoDepois?.sheetSummary.contributionMarginValue).not.toBe("--");
    expect(pratoDepois?.sheetSummary.packagingShareOnCmv).not.toBe("--");
  });
});
