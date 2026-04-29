import "server-only";
import pino from "pino";
import { getServerEnv } from "@/modules/platform/server/env";

const env = getServerEnv();

export const logger = pino({
  name: "sis-restaurante",
  level: env.LOG_LEVEL
});
