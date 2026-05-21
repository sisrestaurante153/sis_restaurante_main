import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarNav } from "@/modules/platform/ui/sidebar-nav";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock()
}));

describe("SidebarNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/itens");
  });

  it("renderiza as seções de navegação com rota ativa destacada", () => {
    render(<SidebarNav />);

    // Seções presentes na navegação atual
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.getAllByText("Cadastros").length).toBeGreaterThanOrEqual(1);

    // Dashboard está em "Principal"
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();

    // Itens e Fichas Tecnicas presentes
    expect(screen.getByRole("link", { name: /^itens$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fichas tecnicas/i })).toBeInTheDocument();
  });

  it("rota ativa recebe aria-current='page'", () => {
    usePathnameMock.mockReturnValue("/itens");
    render(<SidebarNav />);

    const activeLink = screen.getByRole("link", { name: /^itens$/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("exibe badge com contagem de pendências", () => {
    render(
      <SidebarNav
        pendingCounts={{
          "/importacao": 4
        }}
      />
    );

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("seção Administracao só aparece para admin", () => {
    render(<SidebarNav roleCodes={[]} />);
    expect(screen.queryByText("Administracao")).not.toBeInTheDocument();

    render(<SidebarNav roleCodes={["admin"]} />);
    expect(screen.getAllByText("Administracao").length).toBeGreaterThanOrEqual(1);
  });

  it("link de Importacao está presente", () => {
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: /importacao/i })).toBeInTheDocument();
  });
});
