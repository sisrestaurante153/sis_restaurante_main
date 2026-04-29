import { describe, expect, it } from "vitest";
import { hashPassword } from "@/modules/access/server/auth-service";

describe("password policy", () => {
  it("rejects passwords shorter than 8 characters", async () => {
    await expect(hashPassword("curta")).rejects.toThrow("Senha");
  });
});
