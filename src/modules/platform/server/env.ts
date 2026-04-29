import { z } from "zod";

const sessionSecretSchema = z.string().trim().min(32);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("SIS Restaurante"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  IMPORT_STORAGE_DIR: z.string().min(1).default("artifacts/runtime/imports"),
  IMPORT_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  SESSION_SECRET: sessionSecretSchema.optional(),
  POSTGRES_DB: z.string().min(1).default("sis_restaurante"),
  POSTGRES_USER: z.string().min(1).default("sis"),
  POSTGRES_PASSWORD: z.string().min(1).default("sis")
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  input: Record<string, string | undefined> = process.env
): ServerEnv {
  return serverEnvSchema.parse(input);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function getRequiredSessionSecret(
  input: Record<string, string | undefined> = process.env
) {
  const sessionSecret = input.SESSION_SECRET?.trim();

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required.");
  }

  return sessionSecretSchema.parse(sessionSecret);
}
