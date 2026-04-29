import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(app)/dashboard/page";

vi.mock("@/modules/catalog/server/catalog-repository", () => ({
  getCatalogRepository: () => ({
    listItems: async () => ({
      items: [
        { id: "1", fichaStatus: null },
        { id: "2", fichaStatus: "ativa" }
      ],
      totalCount: 42
    })
  })
}));

vi.mock("@/modules/engineering/server/engineering-repository", () => ({
  getEngineeringRepository: () => ({
    listFichas: async () => ({
      items: [],
      totalCount: 18
    }),
    listCostSummaries: async () => [{ total: "1000.00" }, { total: "1340.00" }]
  })
}));

vi.mock("@/modules/import/server/import-repository", () => ({
  getImportRepository: () => ({
    listPendingConflicts: async () => [{ id: "c1" }, { id: "c2" }, { id: "c3" }]
  })
}));

describe("DashboardPage", () => {
  it("renders KPI cards, attention points and quick actions with the new labels", async () => {
    render(await DashboardPage());

    expect(screen.getByText("Itens mestres")).toBeInTheDocument();
    expect(screen.getByText("Fichas versionadas")).toBeInTheDocument();
    expect(screen.getByText("Pendencias de importacao")).toBeInTheDocument();
    expect(screen.getByText("Custo consolidado")).toBeInTheDocument();
    expect(screen.getByText("Pontos de atencao")).toBeInTheDocument();
    expect(screen.getByText("Atalhos rapidos")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /^novo item$/i })).toHaveAttribute("href", "/itens/novo");
    expect(screen.getByRole("link", { name: /ver custos/i })).toHaveAttribute("href", "/custos");
    expect(screen.getByRole("link", { name: /pendencias de importacao/i })).toHaveAttribute(
      "href",
      "/importacao"
    );
  });
});
