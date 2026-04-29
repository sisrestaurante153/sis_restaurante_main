import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShellClient } from "@/components/layout/AppShellClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/components/layout/SidebarNav", () => ({
  SidebarNav: () => <nav>navegacao mockada</nav>
}));

vi.mock("@/modules/access/ui/logout-button", () => ({
  LogoutButton: () => <button type="button">sair</button>
}));

describe("AppShellClient", () => {
  it("renders the HTML-aligned shell: logo, email footer, user menu, no collapse button", () => {
    render(
      <AppShellClient
        currentUser={{
          name: "Administrador Sistema",
          email: "admin@sis-restaurante.local",
          roleCodes: ["admin"]
        }}
      >
        <div>conteudo</div>
      </AppShellClient>
    );

    // Legacy header copy stays removed.
    expect(screen.queryByText("Painel operacional")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Cadastro mestre, fichas recursivas e leitura imediata de custo, impacto e rastreabilidade."
      )
    ).not.toBeInTheDocument();

    // Collapse button removed — HTML reference has no collapse control.
    expect(screen.queryByLabelText("Recolher sidebar")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expandir sidebar")).not.toBeInTheDocument();

    // Logo (SIS Restaurante) present in both desktop sidebar and mobile AppBar — at least one.
    expect(screen.getAllByText("SIS Restaurante").length).toBeGreaterThan(0);

    // Email-only footer (no chip, no Sair inline in footer — Sair lives in topbar menu).
    expect(screen.getAllByText("admin@sis-restaurante.local").length).toBeGreaterThan(0);

    // User menu trigger exists (desktop and mobile AppBar each render one).
    expect(screen.getAllByLabelText("Abrir menu do usuario").length).toBeGreaterThan(0);
  });
});
