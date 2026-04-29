import "dotenv/config";
import { defineConfig } from "prisma/config";

const defaultDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://sis:sis@localhost:5432/sis_restaurante?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: defaultDatabaseUrl
  }
});
