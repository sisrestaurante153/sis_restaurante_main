import { NextResponse } from "next/server";
import { getHealthPayload } from "@/modules/platform/server/health/get-health-payload";
import { logger } from "@/modules/platform/server/logger";

export const runtime = "nodejs";

export async function GET() {
  const payload = await getHealthPayload();

  if (payload.status === "degraded") {
    logger.warn({ payload }, "Healthcheck returned degraded status");
  }

  return NextResponse.json(payload, {
    status: payload.status === "ok" ? 200 : 503
  });
}
