import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
    expect(response.headers.get("set-cookie")).toContain("sis_session=");
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
