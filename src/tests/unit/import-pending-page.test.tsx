import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import { DataGridListingSx } from "@/components/ui/data-grid-pattern";
import ImportPendingPage from "@/app/(app)/importacao/pendencias/page";

vi.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    rows = [],
    columns = [],
    initialState,
    autoHeight,
    columnHeaderHeight,
    density,
    disableRowSelectionOnClick,
    pageSizeOptions,
    getRowHeight,
    sx
  }: {
    rows: Array<Record<string, unknown>>;
    columns: Array<{
      field: string;
      valueGetter?: (value: unknown, row: Record<string, unknown>) => unknown;
      renderCell?: (params: { row: Record<string, unknown>; value: unknown }) => ReactNode;
    }>;
    initialState?: {
      pagination?: {
        paginationModel?: {
          page?: number;
          pageSize?: number;
        };
      };
    };
    autoHeight?: boolean;
    columnHeaderHeight?: number;
    density?: string;
    disableRowSelectionOnClick?: boolean;
    pageSizeOptions?: number[];
    getRowHeight?: () => number;
    sx?: unknown;
  }) => (
    <div
      data-testid="mock-data-grid"
      data-auto-height={String(autoHeight)}
      data-column-header-height={String(columnHeaderHeight)}
      data-density={String(density)}
      data-disable-row-selection-on-click={String(disableRowSelectionOnClick)}
      data-page-size-options={JSON.stringify(pageSizeOptions)}
      data-row-height={String(typeof getRowHeight === "function" ? getRowHeight() : "")}
      data-shared-sx={String(sx === DataGridListingSx)}
      data-initial-page={String(initialState?.pagination?.paginationModel?.page ?? "")}
      data-initial-page-size={String(initialState?.pagination?.paginationModel?.pageSize ?? "")}
    >
      {rows.map((row) => (
        <div key={String(row.id)} role="row">
          <button type="button">{String(row.id)}</button>
          {columns.map((column) => {
            const value =
              typeof column.valueGetter === "function"
                ? column.valueGetter(row[column.field], row)
                : row[column.field];
            const content =
              typeof column.renderCell === "function"
                ? column.renderCell({ row, value })
                : value;

            return (
              <div key={column.field} role="gridcell" data-field={column.field}>
                {content as ReactNode}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  )
}));

vi.mock("@/modules/import/server/import-repository", () => ({
  getImportRepository: () => ({
    listPendingConflicts: async () => [
      {
        id: "conf-1",
        executionId: "exec-1",
        type: "nome",
        rawName: "Tomate",
        normalizedName: "Tomate italiano",
        sheetName: "Insumos",
        rowNumber: 42,
        confidence: "0.8200",
        suggestedItemName: "Tomate italiano",
        suggestedAlias: "Tomate",
        stagingStatus: "conflict"
      }
    ]
  })
}));

vi.mock("@/modules/catalog/server/catalog-repository", () => ({
  getCatalogRepository: () => ({
    listItemOptions: async () => [
      { id: "item-1", name: "Tomate italiano", type: "insumo" },
      { id: "item-2", name: "Tomate grape", type: "insumo" }
    ]
  })
}));

describe("ImportPendingPage", () => {
  it("renders reconciliation grid, confidence indicator and resolution dialog", async () => {
    render(await ImportPendingPage({ searchParams: Promise.resolve({ resolved: "1" }) }));

    expect(screen.getByRole("heading", { name: /pendencias de importacao/i })).toBeInTheDocument();
    expect(screen.getByText(/excel original e a fonte de conferencia/i)).toBeInTheDocument();
    const grid = screen.getByTestId("mock-data-grid");

    expect(grid).toHaveAttribute("data-auto-height", "true");
    expect(grid).toHaveAttribute("data-column-header-height", "56");
    expect(grid).toHaveAttribute("data-density", "compact");
    expect(grid).toHaveAttribute("data-disable-row-selection-on-click", "true");
    expect(grid).toHaveAttribute("data-page-size-options", "[10,25,50]");
    expect(grid).toHaveAttribute("data-row-height", "42");
    expect(grid).toHaveAttribute("data-shared-sx", "true");
    expect(grid).toHaveAttribute("data-initial-page", "0");
    expect(grid).toHaveAttribute("data-initial-page-size", "10");
    expect(screen.getByText("Tomate")).toBeInTheDocument();
    expect(screen.getAllByText("Tomate italiano").length).toBeGreaterThan(0);
    expect(screen.getByText("Insumos/L42")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText(/pendencia resolvida com sucesso/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /resolver/i }));

    expect(screen.getByRole("dialog", { name: /resolver pendencia/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/item-alvo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^alias$/i)).toHaveValue("Tomate");
    expect(
      screen.getByLabelText(/aplicar para todas as ocorrencias deste nome nesta execucao/i)
    ).toBeInTheDocument();
  }, 10000);
});
