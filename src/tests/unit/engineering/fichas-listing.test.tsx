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
  StatusChip: ({ status }: { status: string }) => (
    <span data-testid="status-chip" data-status={status}>
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
  width?: number;
  minWidth?: number;
  flex?: number;
  sortable?: boolean;
};

vi.mock("@mui/x-data-grid", () => ({
  DataGrid: ({
    columns = []
  }: {
    rows?: MockGridRow[];
    columns: MockGridColumn[];
  }) => (
    <div role="grid" data-testid="mock-data-grid">
      <div data-testid="column-headers">
        {columns.map((column) => (
          <span
            key={column.field}
            data-field={column.field}
            data-width={column.width !== undefined ? String(column.width) : ""}
            data-min-width={column.minWidth !== undefined ? String(column.minWidth) : ""}
            data-flex={column.flex !== undefined ? String(column.flex) : ""}
          >
            {column.headerName ?? column.field}
          </span>
        ))}
      </div>
    </div>
  )
}));

import { FichasListingView } from "@/modules/engineering/ui/fichas-listing-view";

const HTML_WIDTHS: Record<string, number> = {
  code: 60,
  itemName: 170,
  modalityLabel: 100,
  groupOperational: 100,
  status: 64,
  componentCount: 82,
  correctionFactor: 60,
  cookingIndex: 60,
  totalCost: 82,
  sellingPrice: 80,
  updatedAt: 110,
  notes: 38
};

function renderFichas() {
  return render(
    <FichasListingView
      items={[]}
      page={1}
      pageSize={10}
      totalCount={0}
      query=""
      status="all"
    />
  );
}

function getHeader(field: string): HTMLElement {
  const header = screen.getByTestId("column-headers").querySelector<HTMLElement>(
    `span[data-field="${field}"]`
  );
  if (!header) {
    throw new Error(`Column header with field "${field}" not found`);
  }
  return header;
}

describe("Grade de Fichas — larguras pixel-perfect (SPEC-4-TELAS-ESTRITO)", () => {
  it.each(Object.entries(HTML_WIDTHS))(
    "coluna %s tem largura %ipx (+/- 4px) alinhada ao HTML update/tela-fichas-grade-v1.html",
    (field, targetWidth) => {
      renderFichas();
      const header = getHeader(field);
      const widthAttr = header.getAttribute("data-width") ?? "";
      const width = Number(widthAttr);
      expect(Number.isFinite(width), `column ${field} has no numeric width (got "${widthAttr}")`).toBe(true);
      expect(
        Math.abs(width - targetWidth),
        `column ${field} width ${width}px diverges from HTML target ${targetWidth}px by more than 4px`
      ).toBeLessThanOrEqual(4);
    }
  );

  it("itemName nao possui flex nem minWidth (largura fixa 170px conforme HTML linha 58)", () => {
    renderFichas();
    const header = getHeader("itemName");
    expect(header.getAttribute("data-flex")).toBe("");
    expect(header.getAttribute("data-min-width")).toBe("");
    expect(Number(header.getAttribute("data-width"))).toBe(170);
  });

  it("renderiza as 12 colunas da grade de fichas", () => {
    renderFichas();
    const headers = screen.getByTestId("column-headers");
    const spans = headers.querySelectorAll("span");
    expect(spans).toHaveLength(12);
  });
});
