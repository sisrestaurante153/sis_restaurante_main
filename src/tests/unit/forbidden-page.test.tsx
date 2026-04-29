import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ForbiddenPage from "@/app/forbidden/page";

describe("ForbiddenPage", () => {
  it("renders the centered 403 state with dashboard and login actions", () => {
    render(<ForbiddenPage />);

    expect(screen.getByRole("heading", { name: /acesso negado/i, level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(/voce nao tem permissao para acessar esta pagina/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir ao dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByRole("link", { name: /trocar de usuario/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });
});
