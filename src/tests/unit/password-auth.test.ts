import { describe, expect, it } from "vitest";
import { authenticateByPassword, hashPassword } from "@/modules/access/server/auth-service";

describe("password auth", () => {
  it("authenticates an active user with the correct password", async () => {
    const senhaHash = await hashPassword("admin123");

    const result = await authenticateByPassword({
      email: "admin@sis-restaurante.local",
      password: "admin123",
      findUserByEmail: async () => ({
        id: "user-1",
        email: "admin@sis-restaurante.local",
        nome: "Administrador",
        ativo: true,
        senhaHash,
        roleCodes: ["admin"]
      })
    });

    expect(result).toEqual({
      ok: true,
      user: {
        id: "user-1",
        email: "admin@sis-restaurante.local",
        nome: "Administrador",
        roleCodes: ["admin"]
      }
    });
  });

  it("rejects invalid credentials", async () => {
    const senhaHash = await hashPassword("admin123");

    const result = await authenticateByPassword({
      email: "admin@sis-restaurante.local",
      password: "senha-errada",
      findUserByEmail: async () => ({
        id: "user-1",
        email: "admin@sis-restaurante.local",
        nome: "Administrador",
        ativo: true,
        senhaHash,
        roleCodes: ["admin"]
      })
    });

    expect(result).toEqual({
      ok: false,
      message: "Credenciais invalidas."
    });
  });

  it("rejects inactive users", async () => {
    const senhaHash = await hashPassword("admin123");

    const result = await authenticateByPassword({
      email: "admin@sis-restaurante.local",
      password: "admin123",
      findUserByEmail: async () => ({
        id: "user-1",
        email: "admin@sis-restaurante.local",
        nome: "Administrador",
        ativo: false,
        senhaHash,
        roleCodes: ["admin"]
      })
    });

    expect(result).toEqual({
      ok: false,
      message: "Usuario inativo."
    });
  });
});
