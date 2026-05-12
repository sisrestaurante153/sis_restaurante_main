import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSignedSessionToken,
  readSignedSessionToken,
  type SessionPayload
} from "@/modules/access/server/session";
import { getRequiredSessionSecret } from "@/modules/platform/server/env";

const TEST_SESSION_SECRET = "test-session-secret-0123456789abcdef";
const originalSessionSecret = process.env.SESSION_SECRET;

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

function buildPayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    userId: "user-1",
    restaurantId: "rest_padrao",
    email: "admin@sis-restaurante.local",
    name: "Administrador",
    roleCodes: ["admin"],
    issuedAt: "2026-03-13T18:00:00.000Z",
    expiresAt: "2026-03-20T18:00:00.000Z",
    ...overrides
  };
}

describe("session token", () => {
  it("creates and reads a signed token", async () => {
    const secret = getRequiredSessionSecret();
    const token = await createSignedSessionToken(buildPayload(), secret);

    expect(
      await readSignedSessionToken(token, secret, new Date("2026-03-14T12:00:00.000Z"))
    ).toEqual(buildPayload());
  });

  it("rejects a tampered token", async () => {
    const secret = getRequiredSessionSecret();
    const token = await createSignedSessionToken(buildPayload(), secret);
    const [payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        ...buildPayload(),
        roleCodes: ["consulta"]
      })
    ).toString("base64url");

    expect(await readSignedSessionToken(`${tamperedPayload}.${signature}`, secret)).toBeNull();
    expect(await readSignedSessionToken(`${payload}.invalid`, secret)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const secret = getRequiredSessionSecret();
    const token = await createSignedSessionToken(
      buildPayload({
        expiresAt: "2026-03-13T19:00:00.000Z"
      }),
      secret
    );

    expect(await readSignedSessionToken(token, secret, new Date("2026-03-13T20:00:00.000Z"))).toBeNull();
  });
});
