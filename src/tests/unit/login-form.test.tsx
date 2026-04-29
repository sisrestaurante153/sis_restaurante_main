import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/modules/access/ui/login-form";

describe("LoginForm", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    vi.restoreAllMocks();
  });

  it("permite preencher email e senha e alternar visibilidade da senha", () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Senha") as HTMLInputElement;

    expect(screen.queryByText(/Credenciais demo/i)).not.toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "admin@sis-restaurante.local" } });
    fireEvent.change(passwordInput, { target: { value: "admin123" } });

    expect(emailInput.value).toBe("admin@sis-restaurante.local");
    expect(passwordInput.value).toBe("admin123");
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: /mostrar senha/i }));

    expect(passwordInput.type).toBe("text");
  });

  it("shows the login error inside an alert when authentication fails", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Credenciais invalidas." })
      } as Response);

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@sis-restaurante.local" }
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-errada" }
    });

    fireEvent.submit(screen.getByRole("button", { name: /entrar no painel/i }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciais invalidas.");

    fetchMock.mockRestore();
  });

  it("uses the configured base path for the auth request", async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/sisfichas";

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true
    } as Response);

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@sis-restaurante.local" }
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "admin123" }
    });

    fireEvent.submit(screen.getByRole("button", { name: /entrar no painel/i }).closest("form")!);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/sisfichas/api/auth/login",
        expect.objectContaining({
          method: "POST"
        })
      )
    );
  });
});
