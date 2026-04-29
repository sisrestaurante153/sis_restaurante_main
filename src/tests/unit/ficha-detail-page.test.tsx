import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FichaDetailPage from "@/app/(app)/fichas/[fichaId]/page";

vi.mock("@/modules/engineering/server/engineering-repository", () => ({
  getEngineeringRepository: () => ({
    listModalities: async () => [
      { id: "mod-salao", label: "Salao" },
      { id: "mod-delivery", label: "Delivery" }
    ],
    getFichaDetail: async () => ({
      id: "ficha-1",
      itemId: "item-1",
      itemName: "Bife Acebolado Especial",
      canonicalItemName: "Prato executivo",
      itemType: "prato",
      groupOperational: "Montagem",
      modality: {
        id: "mod-salao",
        label: "Salao"
      },
      version: 3,
      status: "ativa",
      yieldMode: "peso_final",
      percentLoss: "0.0000",
      finalWeight: "0.7450",
      portions: "1.0000",
      preparationMode: "Montar e finalizar.",
      notes: "Sem observacoes.",
      createdAt: "2026-03-16T10:00:00.000Z",
      updatedAt: "2026-03-19T08:20:00.000Z",
      createdAtLabel: "16/03/2026 07:00",
      updatedAtLabel: "19/03/2026 05:20",
      usageUnit: "kg",
      yieldUnitCode: "kg",
      stages: [
        {
          id: "stage-1",
          name: "Montagem do Produto",
          outputQuantity: "0.7450",
          correctionFactor: "1.000000",
          cookingIndex: "1.000000",
          notes: "",
          items: [
            {
              itemId: "item-insumo",
              componentType: "ingrediente",
              quantityUsed: "1.0000",
              usageUnit: "kg",
              levelLabel: "N1",
              notes: ""
            }
          ]
        }
      ],
      components: [
        {
          itemId: "item-insumo",
          componentType: "ingrediente",
          quantityUsed: "1.0000",
          usageUnit: "kg",
          levelLabel: "N1",
          notes: ""
        }
      ],
      costs: {
        direct: "15.4600",
        inherited: "1.0000",
        packaging: "1.9300",
        total: "18.3900",
        perKg: "24.6846",
        perPortion: "18.3900",
        finalOutput: "0.7450"
      },
      excelSummary: {
        totalGross: "0.7450",
        totalNet: "0.7450",
        postCookingWeight: "0.7450",
        cookingFactorGross: "1.0000",
        cookingFactorNet: "1.0000",
        totalInputCost: "15.4600",
        costWithoutPackagingPerKg: "20.7600",
        cmvPerKg: "20.8900",
        costReal: "18.3900",
        lastCalculatedAt: "2026-03-20T10:00:00.000Z"
      },
      sheetSummary: {
        totalGross: "0.7450",
        totalNet: "0.7450",
        postCookingWeight: "0.7450",
        cookingFactorGross: "1.0000",
        cookingFactorNet: "1.0000",
        totalInputCost: "15.4600",
        costWithoutPackagingPerKg: "20.7600",
        cmvPerKg: "20.8900",
        packagingCost: "1.9300",
        salePrice: "87.9000",
        variableExpensePercent: "0.1500",
        contributionMarginValue: "56.3250",
        contributionMarginPercent: "0.6408",
        mealCmv: "0.2092",
        packagingShareOnCmv: "0.1050",
        costReal: "18.3900",
        preparationModePreview: "Montar e finalizar."
      }
    })
  })
}));

vi.mock("@/modules/catalog/server/catalog-repository", () => ({
  getCatalogRepository: () => ({
    listItemOptions: async () => [
      {
        id: "item-1",
        name: "Prato executivo",
        type: "prato",
        operationalCategory: "Montagem",
        usageUnit: "kg",
        currentCost: "18.3900",
        finalOutput: "0.7450"
      },
      {
        id: "item-insumo",
        name: "Arroz",
        type: "insumo",
        operationalCategory: "Graos",
        usageUnit: "kg",
        currentCost: "5.2000",
        finalOutput: "1.0000"
      }
    ]
  })
}));

describe("FichaDetailPage", () => {
  it("renders the editing layout without the legacy summary sidebar", async () => {
    render(await FichaDetailPage({ params: Promise.resolve({ fichaId: "ficha-1" }) }));

    expect(screen.getByRole("heading", { name: /bife acebolado especial/i })).toBeInTheDocument();
    expect(screen.queryByText("Resumo de custos")).not.toBeInTheDocument();
    expect(screen.queryByText(/custo por kg/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/total atual/i)).not.toBeInTheDocument();
    expect(screen.getByText(/observacao na ficha/i)).toBeInTheDocument();
    expect(screen.getByText("Custo atual da ficha")).toBeInTheDocument();
    expect(screen.getByText("18,39")).toBeInTheDocument();
    expect(screen.getByLabelText(/duplicar ficha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/inativar ficha/i)).toBeInTheDocument();
  });
});
