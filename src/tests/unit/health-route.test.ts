import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { getHealthPayload } from "@/modules/platform/server/health/get-health-payload";

describe("health bootstrap", () => {
  it("retorna payload ok sem banco configurado", async () => {
    const payload = await getHealthPayload({
      env: {
        NODE_ENV: "test",
        APP_NAME: "SIS Restaurante",
        APP_URL: "http://localhost:3000",
        DATABASE_URL: undefined,
        LOG_LEVEL: "silent",
        IMPORT_STORAGE_DIR: "artifacts/runtime/imports",
        IMPORT_WORKER_POLL_INTERVAL_MS: 5000,
        SESSION_SECRET: "0123456789abcdef0123456789abcdef",
        POSTGRES_DB: "sis_restaurante",
        POSTGRES_USER: "sis",
        POSTGRES_PASSWORD: "sis"
      },
      now: new Date("2026-03-13T12:00:00.000Z")
    });

    expect(payload).toEqual({
      status: "ok",
      app: {
        name: "SIS Restaurante",
        environment: "test"
      },
      database: {
        status: "not_configured"
      },
      timestamp: "2026-03-13T12:00:00.000Z"
    });
  });

  it("degrada quando a sonda do banco falha", async () => {
    const payload = await getHealthPayload({
      env: {
        NODE_ENV: "test",
        APP_NAME: "SIS Restaurante",
        APP_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://sis:sis@localhost:5432/sis_restaurante?schema=public",
        LOG_LEVEL: "silent",
        IMPORT_STORAGE_DIR: "artifacts/runtime/imports",
        IMPORT_WORKER_POLL_INTERVAL_MS: 5000,
        SESSION_SECRET: "0123456789abcdef0123456789abcdef",
        POSTGRES_DB: "sis_restaurante",
        POSTGRES_USER: "sis",
        POSTGRES_PASSWORD: "sis"
      },
      probeDatabase: async () => "unreachable"
    });

    expect(payload.status).toBe("degraded");
    expect(payload.database.status).toBe("unreachable");
  });

  it("responde 200 na rota HTTP do healthcheck", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
  });
});
