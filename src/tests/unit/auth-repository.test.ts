import { describe, expect, it } from "vitest";
import { getAuthRepository } from "@/modules/access/server/auth-repository";

describe("auth repository", () => {
  it("returns the seeded admin user with role codes", async () => {
    const repository = getAuthRepository();
    const user = await repository.findUserByEmail("admin@sis-restaurante.local");

    expect(user?.email).toBe("admin@sis-restaurante.local");
    expect(user?.ativo).toBe(true);
    expect(user?.roleCodes).toContain("admin");
    expect(user?.senhaHash).toContain("scrypt:");
  });
});
