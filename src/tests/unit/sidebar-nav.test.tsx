import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarNav } from "@/modules/platform/ui/sidebar-nav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock()
}));

describe("SidebarNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/custos");
  });

  it("renders grouped navigation sections with current route highlighted", () => {
    render(<SidebarNav />);

    // "Visao geral" (Dashboard) removed from sidebar to match HTML reference.
    // Dashboard remains reachable via /dashboard URL.
    expect(screen.queryByText("Visao geral")).not.toBeInTheDocument();
    expect(screen.getByText("Cadastros")).toBeInTheDocument();
    expect(screen.getByText("Operacao")).toBeInTheDocument();
    expect(screen.getByText("Controle")).toBeInTheDocument();

    const activeLink = screen.getByRole("link", { name: /custos/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("shows the pending count badge for manual reconciliation entries", () => {
    render(
      <SidebarNav
        pendingCounts={{
          "/importacao": 4
        }}
      />
    );

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("hides Dashboard and Composicao entries (match HTML reference)", () => {
    render(<SidebarNav />);

    // Dashboard removed from sidebar (HTML reference does not list it).
    expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
    // Composicao removed from sidebar (HTML reference does not list it).
    expect(screen.queryByRole("link", { name: /composicao/i })).not.toBeInTheDocument();
    // Itens and Fichas Tecnicas still present.
    expect(screen.getByRole("link", { name: /itens/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fichas tecnicas/i })).toBeInTheDocument();
  });
});
