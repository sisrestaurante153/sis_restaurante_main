import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export function getPrismaClient(connectionString?: string) {
  if (!connectionString) {
    return null;
  }

  if (global.prisma) {
    return global.prisma;
  }

  // max:1 é essencial em ambientes serverless (Vercel): cada invocação de função
  // é isolada, então mais de 1 conexão por instância apenas esgota o pool do
  // PgBouncer sem ganho real. O pooling real acontece no lado do PgBouncer/Supabase.
  const adapter = new PrismaPg({ connectionString, max: 1 });
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
  }

  return prisma;
}
