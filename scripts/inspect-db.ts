import * as dotenv from "dotenv";
dotenv.config();

import { getPrismaClient } from "../src/modules/platform/infra/prisma";

async function main() {
  const prisma = getPrismaClient(process.env.DATABASE_URL);
  if (!prisma) {
    console.error("Could not construct Prisma Client");
    return;
  }
  try {
    const items = await prisma.item.findMany({
      where: {
        nm_item: {
          contains: "Arroz",
          mode: "insensitive"
        }
      }
    });
    console.log("ITEMS with 'Arroz' in name:");
    for (const item of items) {
      console.log(`- Item ID: ${item.cd_item}, Nome: ${item.nm_item}, Codigo Interno: ${item.ds_codigo_interno}`);
    }
  } catch (err) {
    console.error("Error inspecting DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
