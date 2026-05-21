import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock("@mui/material/useMediaQuery", () => ({
  default: () => false
}));

vi.mock("@mui/material/Tooltip", () => ({
  default: ({
    title,
    children
  }: {
    title?: ReactNode;
    children: ReactNode;
  }) => <span data-testid="tooltip" data-title={String(title)}>{children}</span>
}));

vi.mock("@/components/ui/StatusChip", () => ({
  StatusChip: ({ status, hexColors }: { status: string; hexColors?: { bg: string; text: string } }) => (
    <span data-testid="status-chip" data-status={status} data-bg={hexColors?.bg ?? ""}>
      {status}
    </span>
  )
}));

vi.mock("@/modules/access/server/session-cookie", () => ({
  SESSION_COOKIE_NAME: "sis_session",
  requireSession: vi.fn(async () => ({
    userId: "user-test",
    restaurantId: "rest-test",
    email: "test@test.com",
    name: "Test User",
    roleCodes: ["admin"],
    subscriptionStatus: "active",
    trialEndsAt: null
  })),
  getCurrentSession: vi.fn(async () => null),
  createUserSession: vi.fn(async () => undefined),
  clearUserSession: vi.fn(async () => undefined)
}));

vi.mock("@/modules/catalog/server/catalog-repository", () => ({
  getCatalogRepository: () => ({
    listItems: async () => ({
      items: [
        {
          id: "item-1",
          code: "INS-001",
          name: "Arroz integral",
          type: "insumo",
          category: "Graos",
          stockUnit: "kg",
          purchaseQuantity: "1.0000",
          baseUnitCost: "5.3000",
          conversionFactor: "1000.0000",
          usageUnit: "g",
          usageQuantity: "0.0010",
          usagePrice: "0.0045",
          supplierName: "Distribuidora ABC",
          supplierCount: 2,
          description: "Grao base para pratos executivos.",
          active: true,
          updatedAt: "2026-03-12T10:00:00.000Z"
        }
      ],
      totalCount: 1,
      totalPages: 1,
      page: 1
    })
  })
}));

vi.mock("@/modules/master-data/server/master-data-repository", () => ({
  getMasterDataRepository: () => ({
    listOperationalCategories: async () => [
      { id: "cat-1", code: "graos", name: "Graos", active: true },
      { id: "cat-2", code: "proteinas", name: "Proteinas", active: true }
    ]
  })
}));

describe("ItemsPage", () => {
  it("renderiza o cabeçalho, filtros, colunas e dados do item", async () => {
    const { default: ItemsPage } = await import("@/app/(app)/itens/page");
    render(await ItemsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /^itens$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar por nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tipo$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoria operacional/i)).toBeInTheDocument();

    // Colunas da tabela
    expect(screen.getByText("Codigo")).toBeInTheDocument();
    expect(screen.getByText("Nome do Item")).toBeInTheDocument();
    expect(screen.getByText("Qtde Compra")).toBeInTheDocument();
    expect(screen.getByText("Un. Compra")).toBeInTheDocument();
    expect(screen.getByText("Preco Compra")).toBeInTheDocument();
    expect(screen.getByText("Fator Conv.")).toBeInTheDocument();
    expect(screen.getByText("Qtde Uso")).toBeInTheDocument();
    expect(screen.getByText("Un. Uso")).toBeInTheDocument();
    expect(screen.getByText("Preco Uso")).toBeInTheDocument();
    expect(screen.getByText("Fornecedor")).toBeInTheDocument();
    expect(screen.getByText("Ult. Atualizacao")).toBeInTheDocument();
    expect(screen.getByText("Obs")).toBeInTheDocument();
    expect(screen.getAllByText(/cadastro mestre/i).length).toBeGreaterThan(0);

    // Dado renderizado na tabela
    expect(screen.getByText("Arroz integral")).toBeInTheDocument();
  });

  it("navega para a ficha do item ao clicar em uma linha", async () => {
    const { default: ItemsPage } = await import("@/app/(app)/itens/page");
    render(await ItemsPage({ searchParams: Promise.resolve({}) }));

    const rows = screen.getAllByRole("row");
    const dataRow = rows.find((row) => row.textContent?.includes("Arroz integral"));
    expect(dataRow).toBeDefined();
    fireEvent.click(dataRow as HTMLElement);
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("item-1"));
  });
});
