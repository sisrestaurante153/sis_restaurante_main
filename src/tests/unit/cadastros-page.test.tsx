import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CadastrosPage from "@/app/(app)/cadastros/page";

vi.mock("@/modules/master-data/server/master-data-repository", () => ({
  getMasterDataRepository: () => ({
    listSuppliers: async () => [{ id: "forn-1", name: "VMarket", active: true }],
    listUnits: async () => [
      { id: "un-1", code: "kg", name: "Quilograma", measureType: "massa", active: true }
    ],
    listOperationalCategories: async () => [
      { id: "cat-1", code: "hortifruti", name: "Hortifruti", active: true }
    ],
    listModalities: async () => [
      { id: "mod-1", code: "salao", name: "Salao", active: true }
    ],
    listItemTypes: async () => [
      { id: "tipo-1", code: "prato", name: "Prato", active: true }
    ],
    listStageTypes: async () => [
      { id: "etapa-1", code: "limpeza_pre_preparo", name: "Limpeza / Pre-Preparo", active: true }
    ]
  })
}));

describe("CadastrosPage", () => {
  it("renders the master data workspace with all requested sections", async () => {
    render(await CadastrosPage({}));

    expect(screen.getByRole("heading", { name: /cadastros mestres/i })).toBeInTheDocument();
    expect(screen.getByText("Fornecedores")).toBeInTheDocument();
    expect(screen.getByText("Unidades")).toBeInTheDocument();
    expect(screen.getByText("Categorias operacionais")).toBeInTheDocument();
    expect(screen.getByText("Modalidades")).toBeInTheDocument();
    expect(screen.getByText("Tipos de item")).toBeInTheDocument();
    expect(screen.getAllByText(/salvar/i).length).toBeGreaterThan(0);
  });
});
