import { describe, expect, it } from "vitest";
import { getRequiredSessionSecret, parseServerEnv } from "@/modules/platform/server/env";

/**
 * PDFV2-CRIT-04: SESSION_SECRET obrigatorio em production, sem fallback hardcoded.
 *
 * Usa `Record<string, string | undefined>` explicito (em vez de mutar `process.env`)
 * porque `process.env.NODE_ENV` e readonly no tipo `ProcessEnv` moderno.
 */

describe("getRequiredSessionSecret — SESSION_SECRET (PDFV2-CRIT-04)", () => {
  it("throws quando SESSION_SECRET ausente em production sem fallback hardcoded", () => {
    const env: Record<string, string | undefined> = { NODE_ENV: "production" };
    expect(() => getRequiredSessionSecret(env)).toThrow(/SESSION_SECRET/);
  });

  it("nao usa fallback hardcoded — throws puro sem default string", () => {
    const env: Record<string, string | undefined> = { NODE_ENV: "production" };
    // Garante que getRequiredSessionSecret nunca retorna string fallback conhecida
    expect(() => getRequiredSessionSecret(env)).toThrow();
  });

  it("parseServerEnv mantem SESSION_SECRET undefined quando ausente (sem fallback)", () => {
    const env: Record<string, string | undefined> = { NODE_ENV: "production" };
    const parsed = parseServerEnv(env);
    expect(parsed.SESSION_SECRET).toBeUndefined();
  });
});
