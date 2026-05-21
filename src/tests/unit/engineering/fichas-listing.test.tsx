import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@mui/material/useMediaQuery", () => ({
  default: () => true
}));

vi.mock("@mui/material/Tooltip", () => ({
  default: ({ title, children }: { title?: ReactNode; children: ReactNode }) => (
    <span data-testid="tooltip" data-title={String(title)}>{children}</span>
  )
}));

vi.mock("@/components/ui/StatusChip", () => ({
  StatusChip: ({ status }: { status: string }) => (
    <span data-testid="status-chip" data-status={status}>{status}</span>
  )
}));

import { FichasListingView } from "@/modules/engineering/ui/fichas-listing-view";

// Larguras definidas no <colgroup> do componente atual (fichas-listing-view.tsx)
const EXPECTED_WIDTHS = [60, 170, 100, 100, 82, 60, 60, 82, 80, 100, 110, 64, 38];

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

describe("Grade de Fichas — estrutura da tabela", () => {
  it("renderiza 13 colunas no colgroup", () => {
    const { container } = renderFichas();
    const cols = container.querySelectorAll("colgroup col");
    expect(cols).toHaveLength(13);
  });

  it("larguras das colunas batem com a especificação (tolerância ±4px)", () => {
    const { container } = renderFichas();
    const cols = Array.from(container.querySelectorAll("colgroup col"));

    EXPECTED_WIDTHS.forEach((expectedWidth, index) => {
      const styleWidth = (cols[index] as HTMLElement).style.width;
      const actual = parseInt(styleWidth, 10);
      expect(
        Math.abs(actual - expectedWidth),
        `coluna ${index} tem ${actual}px mas esperado ${expectedWidth}px`
      ).toBeLessThanOrEqual(4);
    });
  });

  it("coluna Produto tem largura 170px", () => {
    const { container } = renderFichas();
    const produtoCol = container.querySelectorAll("colgroup col")[1] as HTMLElement;
    expect(parseInt(produtoCol.style.width, 10)).toBe(170);
  });

  it("renderiza os cabeçalhos esperados no thead", () => {
    renderFichas();
    const headers = ["Codigo", "Produto", "Modalidade", "FC", "IC", "Status", "Obs"];
    for (const header of headers) {
      expect(screen.getByRole("columnheader", { name: new RegExp(header, "i") })).toBeInTheDocument();
    }
  });

  it("exibe '0 fichas encontradas' quando lista está vazia", () => {
    renderFichas();
    expect(screen.getByText(/0 fichas encontradas/i)).toBeInTheDocument();
  });

  it("exibe mensagem quando nenhuma ficha é encontrada no tbody", () => {
    renderFichas();
    expect(screen.getByText(/nenhuma ficha encontrada/i)).toBeInTheDocument();
  });
});
