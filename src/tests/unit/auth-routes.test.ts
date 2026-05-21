import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/access/server/auth-service", () => ({
  signInWithPassword: vi.fn(async (email: string, password: string) => {
    if (email === "admin@sis-restaurante.local" && password === "admin123") {
      return {
        ok: true as const,
        user: { id: "user-1", email, nome: "Admin", roleCodes: ["admin"] },
        session: { access_token: "tok", expires_in: 3600 }
      };
    }
    return { ok: false as const, message: "Invalid login credentials" };
  })
}));

vi.mock("@/modules/access/server/auth-repository", () => ({
  getAuthRepository: () => ({
    findUserByEmail: async () => ({
      restaurantId: "rest_padrao",
      subscriptionStatus: "active",
      trialEndsAt: null
    })
  })
}));

vi.mock("@/modules/access/server/session-cookie", () => ({
  SESSION_COOKIE_NAME: "sis_session",
  createUserSession: vi.fn(async () => undefined),
  clearUserSession: vi.fn(async () => undefined)
}));

import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";

const TEST_SESSION_SECRET = "test-session-secret-0123456789abcdef";
const originalSessionSecret = process.env.SESSION_SECRET;

describe("auth routes", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = TEST_SESSION_SECRET;
  });

  afterEach(() => {
    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
      return;
    }

    process.env.SESSION_SECRET = originalSessionSecret;
  });

  it("accepts valid credentials and sets the session cookie", async () => {
    const response = await loginPOST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: "admin@sis-restaurante.local",
          password: "admin123"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("sb-access-token=tok");
  });

  it("rejects invalid credentials", async () => {
    const response = await loginPOST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: "admin@sis-restaurante.local",
          password: "senha-errada"
        })
      })
    );

    expect(response.status).toBe(401);
  });

  it("clears the session cookie on logout", async () => {
    const response = await logoutPOST();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("sis_session=;");
  });
});
