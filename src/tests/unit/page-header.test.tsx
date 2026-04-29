import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/modules/platform/ui/page-header";

describe("PageHeader", () => {
  it("renders breadcrumbs, description and header actions in the authenticated layout pattern", () => {
    render(
      <PageHeader
        title="Criar ficha tecnica"
        description="Layout validado para pratos, porcoes e itens compostos."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Fichas", href: "/fichas" },
          { label: "Nova ficha" }
        ]}
        actions={
          <>
            <button type="button">Cancelar</button>
            <button type="button">Salvar ficha</button>
          </>
        }
      />
    );

    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /criar ficha tecnica/i, level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("Layout validado para pratos, porcoes e itens compostos.")
    ).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Fichas")).toBeInTheDocument();
    expect(screen.getByText("Nova ficha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar ficha/i })).toBeInTheDocument();
  });
});
