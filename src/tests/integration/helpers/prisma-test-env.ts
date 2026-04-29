import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

let prisma: PrismaClient | null = null;
let availability: boolean | null = null;

export async function isIntegrationDatabaseAvailable() {
  if (availability !== null) {
    return availability;
  }

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
