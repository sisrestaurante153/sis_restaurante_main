import type { ReactNode } from "react";
import type * as DataGridPatternModule from "@/components/ui/data-grid-pattern";
import { fireEvent, render, screen } from "@testing-library/react";
import { DataGridListingSx } from "@/components/ui/data-grid-pattern";
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

vi.mock("@/components/ui/data-grid-pattern", async (importOriginal) => {
  const actual = await importOriginal<typeof DataGridPatternModule>();

  return {
    ...actual,
    DataGridStackedCell: ({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) => (
      <div data-testid="stacked-cell-sentinel">
        STACKED:{primary}
        {secondary != null ? `|${secondary}` : ""}
      </div>
    ),
    DataGridCenteredCell: ({ children }: { children: ReactNode }) => (
      <div data-testid="centered-cell-sentinel">CENTERED:{children}</div>
    ),
    DataGridNumericCell: ({ children }: { children: ReactNode }) => (
      <div data-testid="numeric-cell-sentinel">NUMERIC:{children}</div>
    )
  };
});

type MockGridRow = Record<string, unknown>;
type MockGridColumn = {
  field: string;
  headerName?: string;
  valueGetter?: (value: unknown, row: MockGridRow) => unknown;
  renderCell?: (params: { row: MockGridRow; value: unknown }) => ReactNode;
};

vi.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    rows = [],
    columns = [],
    onRowClick,
    onPaginationModelChange,
    paginationModel,
    autoHeight,
    columnHeaderHeight,
    density,
    disableRowSelectionOnClick,
    pageSizeOptions,
    rowCount,
    getRowHeight,
    sx
  }: {
    rows: MockGridRow[];
    columns: MockGridColumn[];
    onRowClick?: (params: { row: MockGridRow }) => void;
    onPaginationModelChange?: (model: { page: number; pageSize: number }) => void;
    paginationModel?: { page: number; pageSize: number };
    autoHeight?: boolean;
    columnHeaderHeight?: number;
    density?: string;
    disableRowSelectionOnClick?: boolean;
    pageSizeOptions?: number[];
    rowCount?: number;
    getRowHeight?: () => number;
    sx?: unknown;
  }) => (
    <div
      role="grid"
      data-testid="mock-data-grid"
      data-auto-height={String(autoHeight)}
      data-column-header-height={String(columnHeaderHeight)}
      data-density={String(density)}
      data-disable-row-selection-on-click={String(disableRowSelectionOnClick)}
      data-page-size-options={JSON.stringify(pageSizeOptions)}
      data-pagination-page={String(paginationModel?.page ?? "")}
      data-pagination-page-size={String(paginationModel?.pageSize ?? "")}
      data-row-count={String(rowCount ?? "")}
      data-row-height={String(typeof getRowHeight === "function" ? getRowHeight() : "")}
      data-shared-sx={String(sx === DataGridListingSx)}
    >
      <div>
        {columns.map((column) => (
          <span key={column.field}>{column.headerName ?? column.field}</span>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={() =>
            onPaginationModelChange?.({
              page: (paginationModel?.page ?? 0) + 1,
              pageSize: paginationModel?.pageSize ?? 10
            })
          }
        >
          Proxima pagina
        </button>
        <button
          type="button"
          onClick={() =>
            onPaginationModelChange?.({
              page: paginationModel?.page ?? 0,
              pageSize: 25
            })
          }
        >
          Pagina 25
        </button>
      </div>
      {rows.map((row) => (
        <div key={String(row.id)} role="row">
          <button type="button" onClick={() => onRowClick?.({ row })}>
            Abrir {String(row.name)}
          </button>
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
  it("renders the expanded operational listing contract and wires navigation", async () => {
    const { default: ItemsPage } = await import("@/app/(app)/itens/page");
    render(await ItemsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /^itens$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar por nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tipo$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoria operacional/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /novo item/i })).toHaveLength(1);
    expect(screen.getByText("Codigo")).toBeInTheDocument();
    expect(screen.getByText("Nome do Item")).toBeInTheDocument();
    expect(screen.getAllByText("Tipo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Categoria Op.")).toBeInTheDocument();
    expect(screen.getByText("Qtde Compra")).toBeInTheDocument();
    expect(screen.getByText("Un. Compra")).toBeInTheDocument();
    expect(screen.getByText("Preco Compra")).toBeInTheDocument();
    expect(screen.getByText("Fator Conv.")).toBeInTheDocument();
    expect(screen.getByText("Qtde Uso")).toBeInTheDocument();
    expect(screen.getByText("Un. Uso")).toBeInTheDocument();
    expect(screen.getByText("Preco Uso")).toBeInTheDocument();
    expect(screen.getByText("Fornecedor")).toBeInTheDocument();
    expect(screen.getAllByText("Status").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ult. Atualizacao")).toBeInTheDocument();
    expect(screen.getByText("Obs")).toBeInTheDocument();
    expect(screen.getByText("CADASTRO MESTRE")).toBeInTheDocument();

    const grid = screen.getByTestId("mock-data-grid");

    expect(grid).toHaveAttribute("data-auto-height", "true");
    expect(grid).toHaveAttribute("data-column-header-height", "56");
    expect(grid).toHaveAttribute("data-density", "compact");
    expect(grid).toHaveAttribute("data-disable-row-selection-on-click", "true");
    expect(grid).toHaveAttribute("data-page-size-options", JSON.stringify([10, 25, 50]));
    expect(grid).toHaveAttribute("data-pagination-page", "0");
    expect(grid).toHaveAttribute("data-pagination-page-size", "10");
    expect(grid).toHaveAttribute("data-row-count", "1");
    expect(grid).toHaveAttribute("data-row-height", "42");
    expect(grid).toHaveAttribute("data-shared-sx", "true");

    fireEvent.click(screen.getByRole("button", { name: /abrir arroz integral/i }));
    expect(pushMock).toHaveBeenLastCalledWith("/itens/item-1");

    fireEvent.click(screen.getByRole("button", { name: /proxima pagina/i }));
    expect(pushMock).toHaveBeenLastCalledWith("/itens?page=2");

    fireEvent.click(screen.getByRole("button", { name: /pagina 25/i }));
    expect(pushMock).toHaveBeenLastCalledWith("/itens?pageSize=25");
  });
});
