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
    const fichas = await prisma.fichaTecnica.findMany({
      include: {
        itemResultante: true
      }
    });

    console.log("Checking for name mismatch between Ficha exibicao and Item:");
    for (const f of fichas) {
      if (f.nm_exibicao && f.itemResultante) {
        const itemNorm = f.itemResultante.nm_normalizado;
        // Basic normalization helper to compare
        const normExibicao = f.nm_exibicao.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        if (itemNorm !== normExibicao && f.itemResultante.nm_item !== f.nm_exibicao) {
          console.log(`- Mismatch! Ficha: "${f.nm_exibicao}" (ID: ${f.cd_ficha_tecnica}), Item: "${f.itemResultante.nm_item}" (ID: ${f.cd_item_resultante})`);
        }
      }
    }
  } catch (err) {
    console.error("Error inspecting DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
