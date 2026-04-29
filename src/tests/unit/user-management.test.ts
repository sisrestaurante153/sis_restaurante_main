import { describe, expect, it } from "vitest";
import {
  normalizeUserEmail,
  parseRoleCodes
} from "@/modules/access/domain/user-management";

describe("user management helpers", () => {
  it("normalizes email for CLI operations", () => {
    expect(normalizeUserEmail("  ADMIN@Sis-Restaurante.Local ")).toBe(
      "admin@sis-restaurante.local"
    );
  });

  it("deduplicates role codes while preserving order", () => {
    expect(parseRoleCodes(" admin, engenharia ,admin,consulta ")).toEqual([
      "admin",
      "engenharia",
      "consulta"
    ]);
  });

  it("rejects empty role input", () => {
    expect(() => parseRoleCodes(" , , ")).toThrow(
      "Informe pelo menos um role."
    );
  });
});
