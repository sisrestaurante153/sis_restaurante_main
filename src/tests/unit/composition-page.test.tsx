import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompositionPage from "@/app/(app)/composicao/page";

vi.mock("@/modules/engineering/server/engineering-repository", () => ({
  getEngineeringRepository: () => ({
    listCompositionRows: async () => [
      {
        id: "row-1",
        fichaId: "ficha-1",
        fichaName: "Prato X",
        path: "Prato X",
        depth: 0,
        itemName: "Prato X",
        componentType: "prato",
        quantity: "—",
        usageUnit: "un",
        totalCost: "5.3000"
      },
      {
        id: "row-2",
        fichaId: "ficha-1",
        fichaName: "Prato X",
        path: "Prato X > Molho Base",
        depth: 1,
        itemName: "Molho Base",
        componentType: "sub_ficha",
        quantity: "0.2000",
        usageUnit: "l",
        totalCost: "1.5500"
      }
    ]
  })
}));

describe("CompositionPage", () => {
  it("renders the composition tree view with filtering and nested rows", async () => {
    render(await CompositionPage());

    expect(screen.getByRole("heading", { name: /^composicao$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por ficha/i)).toBeInTheDocument();
    expect(screen.getByText("Prato X")).toBeInTheDocument();
    expect(screen.getByText("Molho Base")).toBeInTheDocument();
    expect(screen.getByText(/R\$ 5,30/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 1,55/i)).toBeInTheDocument();
    expect(screen.getByText("sub ficha")).toBeInTheDocument();
  });
});
