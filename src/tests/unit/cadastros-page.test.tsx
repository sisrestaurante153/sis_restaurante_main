import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CadastrosPage from "@/app/(app)/cadastros/page";

describe("CadastrosPage", () => {
  it("renderiza o hub de cadastros com todos os cards de navegação", async () => {
    render(await CadastrosPage());

    expect(screen.getByRole("heading", { name: /cadastros mestres/i })).toBeInTheDocument();
    expect(screen.getByText("Fornecedores")).toBeInTheDocument();
    expect(screen.getByText("Unidades")).toBeInTheDocument();
    expect(screen.getByText("Grupos Operacionais")).toBeInTheDocument();
    expect(screen.getByText("Modalidades")).toBeInTheDocument();
    expect(screen.getByText("Tipos de Item")).toBeInTheDocument();
    expect(screen.getByText("Tipos de Etapa")).toBeInTheDocument();
  });
});
