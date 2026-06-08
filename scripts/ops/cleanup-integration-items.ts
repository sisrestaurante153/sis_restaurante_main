// @ts-nocheck
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  console.log("Buscando itens de integracao orfaos...");

  const items = await prisma.item.findMany({
    where: {
      OR: [
        { nm_item: { contains: "Integracao", mode: "insensitive" } },
        { nm_item: { contains: "Fornecedor Integracao", mode: "insensitive" } }
      ]
    }
  });

  console.log(`Encontrados ${items.length} itens.`);

  let deletedCount = 0;
  let inactivatedCount = 0;

  for (const item of items) {
    try {
      await prisma.item.delete({
        where: { cd_item: item.cd_item }
      });
      console.log(`Removido com sucesso: ${item.nm_item} (${item.cd_item})`);
      deletedCount++;
    } catch (e) {
      // Se falhar por constraint, marca como inativo
      try {
        await prisma.item.update({
          where: { cd_item: item.cd_item },
          data: { sn_ativo: false }
        });
        console.log(`Marcado como inativo (possui dependencias): ${item.nm_item} (${item.cd_item})`);
        inactivatedCount++;
      } catch (err) {
        console.error(`Falha ao processar item ${item.nm_item}:`, err);
      }
    }
  }

  console.log(`Cleanup concluido. Removidos: ${deletedCount}, Inativados: ${inactivatedCount}`);

  await prisma.$disconnect();
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
