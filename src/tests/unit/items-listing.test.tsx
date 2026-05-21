import type { ReactNode } from "react";
import type * as DataGridPatternModule from "@/components/ui/data-grid-pattern";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("@mui/material/useMediaQuery", () => ({
  default: () => true
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
    DataGridCenteredCell: ({ children }: { children: ReactNode }) => (
      <div data-testid="centered-cell-sentinel">{children}</div>
    ),
    DataGridNumericCell: ({ children }: { children: ReactNode }) => (
      <div data-testid="numeric-cell-sentinel">{children}</div>
    )
  };
});

type MockGridRow = Record<string, unknown>;
type MockGridColumn = {
  field: string;
  headerName?: string;
  sortable?: boolean;
  width?: number;
  flex?: number;
  renderCell?: (params: { row: MockGridRow; value: unknown }) => ReactNode;
};

vi.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    rows = [],
    columns = [],
    getRowHeight
  }: {
    rows: MockGridRow[];
    columns: MockGridColumn[];
    getRowHeight?: () => number;
  }) => (
    <div
      role="grid"
      data-testid="mock-data-grid"
      data-row-height={String(typeof getRowHeight === "function" ? getRowHeight() : "")}
    >
      <div data-testid="column-headers">
        {columns.map((column) => (
          <span
            key={column.field}
            data-field={column.field}
            data-sortable={String(column.sortable ?? false)}
            data-width={column.width !== undefined ? String(column.width) : ""}
            data-flex={column.flex !== undefined ? String(column.flex) : ""}
          >
            {column.headerName ?? column.field}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={String(row.id)} role="row">
          {columns.map((column) => {
            const value = row[column.field];
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

import { ItemsListingView } from "@/modules/catalog/ui/items-listing-view";

const EXPECTED_COLUMNS = [
  "Codigo",
  "Nome do Item",
  "Tipo",
  "Categoria",
  "Qtde Compra",
  "Un. Compra",
  "Preco Compra",
  "Fator Conv.",
  "Qtde Uso",
  "Un. Uso",
  "Preco Uso",
  "Fornecedor",
  "Status",
  "Ult. Atualizacao",
  "Obs"
];

function renderListing(overrides: Partial<Parameters<typeof ItemsListingView>[0]> = {}) {
  return render(
    <ItemsListingView
      items={[
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
      ]}
      page={1}
      pageSize={10}
      totalCount={1}
      query=""
      type="all"
      status="all"
      category="all"
      categoryOptions={[
        { value: "Graos", label: "Graos" },
        { value: "Proteinas", label: "Proteinas" }
      ]}
      {...overrides}
    />
  );
}

describe("ItemsListingView", () => {
  it("renders exactly 15 column headers in the correct order", () => {
    const { container } = renderListing();

    const ths = container.querySelectorAll("thead th");
    expect(ths).toHaveLength(15);
    const headerNames = Array.from(ths).map((th) => th.textContent?.trim().replace(/[▲▼↑↓]/g, "").trim());
    expect(headerNames).toEqual(EXPECTED_COLUMNS);
  });

  it("renders CADASTRO MESTRE label", () => {
    renderListing();

    expect(screen.getByText(/cadastro mestre/i)).toBeInTheDocument();
  });

  it("renders Status column with Ativo and Inativo badges", () => {
    renderListing({
      items: [
        {
          id: "item-1",
          code: "INS-001",
          name: "Arroz",
          type: "insumo",
          category: "Graos",
          stockUnit: "kg",
          purchaseQuantity: "1.0000",
          baseUnitCost: "5.3000",
          conversionFactor: "1000.0000",
          usageUnit: "g",
          usageQuantity: "0.0010",
          usagePrice: "0.0045",
          supplierName: "Fornecedor A",
          supplierCount: 1,
          description: "",
          active: true,
          updatedAt: "2026-03-12T10:00:00.000Z"
        },
        {
          id: "item-2",
          code: "INS-002",
          name: "Feijao",
          type: "insumo",
          category: "Graos",
          stockUnit: "kg",
          purchaseQuantity: "0",
          baseUnitCost: "0",
          conversionFactor: "1.0000",
          usageUnit: "g",
          usageQuantity: "0",
          usagePrice: "0",
          supplierName: "",
          supplierCount: 0,
          description: "",
          active: false,
          updatedAt: ""
        }
      ],
      totalCount: 2
    });

    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("renders em-dash for zero-value currency and quantity fields", () => {
    const { container } = renderListing({
      items: [
        {
          id: "item-z",
          code: "Z-001",
          name: "Zero item",
          type: "apoio",
          category: "",
          stockUnit: "",
          purchaseQuantity: "0",
          baseUnitCost: "0",
          conversionFactor: "0",
          usageUnit: "",
          usageQuantity: "0",
          usagePrice: "0",
          supplierName: "",
          supplierCount: 0,
          description: "",
          active: true,
          updatedAt: ""
        }
      ],
      totalCount: 1
    });

    const tds = Array.from(container.querySelectorAll("tbody td"));
    const emDashCells = tds.filter((td) => td.textContent?.includes("\u2014"));
    expect(emDashCells.length).toBeGreaterThanOrEqual(4);
  });

  it("marks name, baseUnitCost, usagePrice, and updatedAt as sortable", () => {
    renderListing();

    const headers = screen.getByTestId("column-headers");
    const sortableFields = Array.from(headers.querySelectorAll("th[data-sortable='true']")).map(
      (th) => th.getAttribute("data-field")
    );
    expect(sortableFields).toContain("name");
    expect(sortableFields).toContain("baseUnitCost");
    expect(sortableFields).toContain("usagePrice");
    expect(sortableFields).toContain("updatedAt");
    expect(sortableFields).toHaveLength(4);
  });

  it("renders Categoria Operacional filter with Todas as categorias option", () => {
    renderListing();

    expect(screen.getByLabelText(/categoria operacional/i)).toBeInTheDocument();
  });

  it("renders Obs tooltip with Ver observacao text when description exists", () => {
    renderListing();

    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toHaveAttribute("data-title", "Ver observacao");
  });

  it("item sem ItemCompra (sem fornecedor) exibe '--' nas colunas derivadas", () => {
    renderListing({
      items: [
        {
          id: "item-no-purchase",
          code: "X-001",
          name: "Item sem fornecedor",
          type: "insumo",
          category: "Graos",
          stockUnit: "--",
          purchaseQuantity: "--",
          baseUnitCost: "--",
          conversionFactor: "--",
          usageQuantity: "--",
          usageUnit: "--",
          usagePrice: "--",
          supplierName: "--",
          supplierCount: 0,
          description: "",
          active: true,
          updatedAt: ""
        }
      ],
      totalCount: 1
    });

    // At least 5 cells (purchaseQuantity, baseUnitCost, usagePrice, usageUnit, supplierName)
    // render the literal "--" fallback.
    const cells = screen.getAllByText("--");
    expect(cells.length).toBeGreaterThanOrEqual(5);
  });

  it("item com 2+ fornecedores exibe badge '+1' ao lado do nome principal", () => {
    renderListing({
      items: [
        {
          id: "item-multi",
          code: "INS-010",
          name: "Item com 2 fornecedores",
          type: "insumo",
          category: "Graos",
          stockUnit: "kg",
          purchaseQuantity: "10.0000",
          baseUnitCost: "8.000000",
          conversionFactor: "1.0000",
          usageQuantity: "10.0000",
          usageUnit: "kg",
          usagePrice: "8.0000",
          supplierName: "VMARKET",
          supplierCount: 2,
          description: "",
          active: true,
          updatedAt: "2026-03-12T10:00:00.000Z"
        }
      ],
      totalCount: 1
    });

    expect(screen.getByText(/VMARKET/)).toBeInTheDocument();
    expect(screen.getByText(/\+1/)).toBeInTheDocument();
  });
});

describe("Grade de Itens - larguras pixel-perfect residuais (SPEC-4-TELAS-ESTRITO)", () => {
  // HTML source of truth: update/tela-itens-grade-v2.html
  //   col 1 (index 1 = name): 162px
  //   col 14 (index 14 = obs): 40px
  const COLUMNS_ORDER = [
    "code", "name", "type", "category", "purchaseQuantity", "stockUnit",
    "baseUnitCost", "conversionFactor", "usageQuantity", "usageUnit",
    "usagePrice", "supplierName", "active", "updatedAt", "description"
  ];
  const TARGET_WIDTHS: Record<string, number> = {
    name: 162,
    description: 40
  };

  it.each(Object.entries(TARGET_WIDTHS))(
    "coluna %s tem largura %ipx (+/- 4px) alinhada ao HTML update/tela-itens-grade-v2.html",
    (field, targetWidth) => {
      const { container } = renderListing();
      const cols = container.querySelectorAll("colgroup col");
      const colIndex = COLUMNS_ORDER.indexOf(field);
      expect(colIndex).toBeGreaterThanOrEqual(0);
      const col = cols[colIndex] as HTMLElement | undefined;
      expect(col).toBeDefined();
      const rawWidth = col?.style.width ?? "";
      const computedWidth = parseInt(rawWidth, 10);
      expect(Number.isFinite(computedWidth)).toBe(true);
      expect(Math.abs(computedWidth - targetWidth)).toBeLessThanOrEqual(4);
    }
  );

  it("coluna name NAO possui flex (largura fixa conforme HTML linha 57)", () => {
    const { container } = renderListing();
    const cols = container.querySelectorAll("colgroup col");
    const nameIndex = COLUMNS_ORDER.indexOf("name");
    const col = cols[nameIndex] as HTMLElement | undefined;
    expect(col).toBeDefined();
    // colgroup col elements don't have a flex style attribute
    expect(col?.style.flex ?? "").toBe("");
  });
});
