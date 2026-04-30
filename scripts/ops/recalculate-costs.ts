// @ts-nocheck
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { ficha_status, PrismaClient } from "../../src/generated/prisma/client";
import { recalculateCascade } from "../../src/modules/engineering/server/cost-engine-service";

function readFlag(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readRepeatedFlag(flag: string) {
  return process.argv.flatMap((value, index) => {
    if (value === flag) {
      return process.argv[index + 1] ?? "";
    }

    return [];
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  const explicitItemIds = readRepeatedFlag("--item-id").filter(Boolean);
  const reason = readFlag("--reason") ?? "script_operacional_manual";

  const itemIds =
    explicitItemIds.length > 0
      ? explicitItemIds
      : [
          ...new Set(
            (
              await prisma.fichaTecnica.findMany({
                where: { tp_status: ficha_status.ativa },
                select: { cd_item_resultante: true }
              })
            ).map((row) => row.cd_item_resultante)
          )
        ];

  if (itemIds.length === 0) {
    throw new Error("Nenhum item encontrado para recalculo.");
  }

  const result = await recalculateCascade(prisma, itemIds, reason);

  console.log(
    JSON.stringify(
      {
        reason,
        order: result.order,
        impact: result.impactRows.map((row) => ({
          itemId: row.itemId,
          itemName: row.itemName,
          depth: row.depth,
          beforeCost: row.beforeCost.toString(),
          afterCost: row.afterCost.toString(),
          deltaCost: row.deltaCost.toString()
        }))
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
