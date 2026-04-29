import type { ReactNode } from "react";
import type * as DataGridPatternModule from "@/components/ui/data-grid-pattern";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataGridListingSx } from "@/components/ui/data-grid-pattern";
import FichasPage from "@/app/(app)/fichas/page";

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
          Tamanho 25
        </button>
      </div>
      {rows.map((row) => (
        <div key={String(row.id)} role="row">
          <button type="button" onClick={() => onRowClick?.({ row })}>
            Abrir {String(row.itemName)}
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

vi.mock("@/modules/engineering/server/engineering-repository", () => ({
  getEngineeringRepository: () => ({
    listFichas: async () => ({
      items: [
        {
          id: "ficha-1",
          itemId: "item-1",
          itemName: "Bife Acebolado Especial",
          code: "FCH-003",
          itemType: "prato",
          version: 3,
          modalityLabel: "Salao",
          groupOperational: "Montagem",
          status: "ativa",
          correctionFactor: "0.9100",
          cookingIndex: "0.7800",
          totalCost: "18.3900",
          updatedAt: "2026-03-18T10:00:00.000Z",
          componentCount: 5,
          notes: "Observacao operacional"
        }
      ],
      totalCount: 1,
      totalPages: 1,
      page: 1
    })
  })
}));

describe("FichasPage", () => {
  it("renders the expanded ficha listing contract with shared navigation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));

    try {
      render(await FichasPage({ searchParams: Promise.resolve({}) }));

      expect(screen.getByRole("heading", { level: 1, name: /fichas tecnicas/i })).toBeInTheDocument();
      // Busca: input nativo flat (sem floating label) — acessar por placeholder/aria-label.
      expect(screen.getByPlaceholderText(/buscar ficha/i)).toBeInTheDocument();
      // Status: native <select> flat — acessar por aria-label.
      expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /nova ficha/i })).toHaveAttribute("href", "/fichas/nova");
      expect(screen.queryByRole("button", { name: /nova ficha/i })).not.toBeInTheDocument();
      expect(screen.getByText("Codigo")).toBeInTheDocument();
      expect(screen.getByText("Produto")).toBeInTheDocument();
      // "Modalidade" + "Grupo" agora aparecem como cabecalho de coluna E como label de filtro.
      expect(screen.getAllByText("Modalidade").length).toBeGreaterThan(0);
      expect(screen.getByText("Grupo Operacional")).toBeInTheDocument();
      // Filtros novos (Modalidade + Grupo) presentes no toolbar para casar com HTML.
      expect(screen.getByLabelText(/^modalidade$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^grupo$/i)).toBeInTheDocument();
      expect(screen.getByText("FC")).toBeInTheDocument();
      expect(screen.getByText("IC")).toBeInTheDocument();
      expect(screen.getByText("Obs")).toBeInTheDocument();
      expect(screen.getByText("Preco de Venda")).toBeInTheDocument();
      expect(screen.queryByText("Versao")).not.toBeInTheDocument();
      expect(screen.getByText("5 itens")).toBeInTheDocument();
      expect(screen.getByText(/R\$ 18,39/i)).toBeInTheDocument();
      expect(screen.getByText(/há 2 dias/i)).toBeInTheDocument();
      expect(screen.getAllByTestId("centered-cell-sentinel").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByTestId("numeric-cell-sentinel").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("V3")).toBeInTheDocument();
      expect(screen.getByText("Bife Acebolado Especial")).toBeInTheDocument();
      expect(
        screen.getAllByTestId("centered-cell-sentinel").some((el) => el.textContent?.includes("ativa"))
      ).toBe(true);
      expect(screen.getAllByTestId("numeric-cell-sentinel")[0]).toHaveTextContent("NUMERIC:R$ 18,39");

      expect(screen.getAllByTestId("tooltip")[0]).toHaveAttribute(
        "data-title",
        new Date("2026-03-18T10:00:00.000Z").toLocaleString("pt-BR")
      );

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

      fireEvent.click(screen.getByRole("button", { name: /abrir bife acebolado especial/i }));
      expect(pushMock).toHaveBeenLastCalledWith("/fichas/ficha-1");

      fireEvent.click(screen.getByRole("button", { name: /proxima pagina/i }));
      expect(pushMock).toHaveBeenLastCalledWith("/fichas?page=2");

      fireEvent.click(screen.getByRole("button", { name: /tamanho 25/i }));
      expect(pushMock).toHaveBeenLastCalledWith("/fichas?pageSize=25");
    } finally {
      vi.useRealTimers();
    }
  });
});
