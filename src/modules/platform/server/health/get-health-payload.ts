import "server-only";
import type { HealthPayload } from "@/modules/platform/domain/health";
import { getServerEnv, type ServerEnv } from "@/modules/platform/server/env";
import { getPrismaClient } from "@/modules/platform/infra/prisma";

type DatabaseProbe = () => Promise<HealthPayload["database"]["status"]>;

interface GetHealthPayloadOptions {
  env?: ServerEnv;
  now?: Date;
  probeDatabase?: DatabaseProbe;
}

async function defaultProbeDatabase(env: ServerEnv) {
  if (!env.DATABASE_URL) {
    return "not_configured" as const;
  }

  try {
    const prisma = getPrismaClient(env.DATABASE_URL);

    if (!prisma) {
      return "not_configured" as const;
    }

    await prisma.$queryRaw`SELECT 1`;
    return "reachable" as const;
  } catch {
    return "unreachable" as const;
  }
}

export async function getHealthPayload(
  options: GetHealthPayloadOptions = {}
): Promise<HealthPayload> {
  const env = options.env ?? getServerEnv();
  const databaseStatus =
    (await options.probeDatabase?.()) ?? (await defaultProbeDatabase(env));

  return {
    status: databaseStatus === "unreachable" ? "degraded" : "ok",
    app: {
      name: env.APP_NAME,
      environment: env.NODE_ENV
    },
    database: {
      status: databaseStatus
    },
    timestamp: (options.now ?? new Date()).toISOString()
  };
}
