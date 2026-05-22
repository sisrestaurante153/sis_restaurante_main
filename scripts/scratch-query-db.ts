import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not configured");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const relations = await prisma.dependenciaItem.findMany({
    where: {
      OR: [
        { cd_item_ascendente: "cmpfta8qy00gi04jpa1ki6hgr" },
        { cd_item_descendente: "cmpfta8qy00gi04jpa1ki6hgr" }
      ]
    },
    include: {
      itemAscendente: true,
      itemDescendente: true
    }
  });

  console.log("DEPENDENCIES:", JSON.stringify(relations, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
