import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

let prisma: PrismaClient | null = null;
let availability: boolean | null = null;

// Trava de seguranca: varios testes de integracao fazem deleteMany() SEM
// filtro em tabelas inteiras (ficha_tecnica, item_compra, etc), assumindo um
// banco de teste isolado e descartavel. Esse projeto nunca teve um banco de
// teste separado - DATABASE_URL sempre apontou pro Supabase de producao real
// (confirmado pelo incidente de 2026-10-26: rodar esses testes apagou quase
// toda ficha tecnica/custo de compra de todos os clientes). Ate existir um
// banco de teste de verdade, rodar esses testes exige esse opt-in explicito -
// sem ele, falha rapido e alto, em vez de silenciosamente destruir dados reais.
function assertDestructiveIntegrationTestsAllowed() {
  if (process.env.ALLOW_DESTRUCTIVE_INTEGRATION_TESTS !== "true") {
    throw new Error(
      "Testes de integracao bloqueados: eles fazem deleteMany() sem filtro em tabelas " +
        "inteiras e DATABASE_URL aqui aponta pro banco de producao real, nao um banco de " +
        "teste isolado (ja causou perda de dados em producao uma vez - 2026-10-26). " +
        "So rode isso contra um banco que voce pode perder por completo, e so entao " +
        "defina ALLOW_DESTRUCTIVE_INTEGRATION_TESTS=true explicitamente."
    );
  }
}

export async function isIntegrationDatabaseAvailable() {
  if (availability !== null) {
    return availability;
  }

  assertDestructiveIntegrationTestsAllowed();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    availability = false;
    return availability;
  }

  try {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString })
    });
    await prisma.$queryRaw`SELECT 1`;
    availability = true;
  } catch {
    availability = false;
  }

  return availability;
}

export function getIntegrationPrisma() {
  assertDestructiveIntegrationTestsAllowed();

  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL nao configurada para testes de integracao.");
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString })
    });
  }

  return prisma;
}

export async function closeIntegrationPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }

  availability = null;
}
