import { describe, expect, it } from "vitest";
import { getRequiredSessionSecret, parseServerEnv } from "@/modules/platform/server/env";

describe("parseServerEnv", () => {
  it("aplica defaults para bootstrap local", () => {
    const env = parseServerEnv({});

    expect(env.APP_NAME).toBe("SIS Restaurante");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
    expect(env.POSTGRES_DB).toBe("sis_restaurante");
    expect(env.SESSION_SECRET).toBeUndefined();
  });

  it("rejeita APP_URL invalida", () => {
    expect(() =>
      parseServerEnv({
        APP_URL: "localhost"
      })
    ).toThrow();
  });

  it("rejeita SESSION_SECRET curto", () => {
    expect(() =>
      parseServerEnv({
        SESSION_SECRET: "curto"
      })
    ).toThrow();
  });

  it("rejeita SESSION_SECRET ausente quando a sessao exige segredo", () => {
    expect(() => getRequiredSessionSecret({})).toThrow("SESSION_SECRET is required.");
  });
});
