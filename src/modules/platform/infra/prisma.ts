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
  // maxWait default do Prisma e 2000ms - tempo baixo demais pra abrir uma
  // transacao interativa (prisma.$transaction(async (tx) => ...)) contra o
  // pooler do Supabase (porta 6543, pgbouncer=true): medido em producao
  // (2026-10-26) levando 10s+ so pra iniciar, mesmo numa transacao trivial.
  // Sem isso, toda chamada que usa transacao interativa falha com
  // "P2028 Unable to start a transaction in the given time" - foi a causa
  // real do "vincular ficha pendente" parecer nao fazer nada ao clicar.
  const prisma = new PrismaClient({ adapter, transactionOptions: { maxWait: 15000, timeout: 30000 } });

  if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
  }

  return prisma;
}
