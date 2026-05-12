/**
 * Seed de multi-tenant: cria o restaurante padrão e associa todos os dados
 * existentes (usuários, itens, fichas, importações) que ainda não têm tenant.
 *
 * Execute com:
 *   npx tsx prisma/seed-tenant.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  // 1. Cria (ou encontra) o restaurante padrão
  const restaurante = await prisma.restaurante.upsert({
    where: { cd_restaurante: "rest_padrao" },
    update: { nm_restaurante: "Restaurante Padrão" },
    create: {
      cd_restaurante: "rest_padrao",
      nm_restaurante: "Restaurante Padrão",
      sn_ativo: true
    }
  });

  console.log(`Restaurante padrão: ${restaurante.cd_restaurante}`);

  // 2. Associa usuários sem tenant
  const usuarios = await prisma.user.updateMany({
    where: { cd_restaurante: null },
    data: { cd_restaurante: restaurante.cd_restaurante }
  });
  console.log(`Usuários atualizados: ${usuarios.count}`);

  // 3. Associa itens sem tenant
  const itens = await prisma.item.updateMany({
    where: { cd_restaurante: null },
    data: { cd_restaurante: restaurante.cd_restaurante }
  });
  console.log(`Itens atualizados: ${itens.count}`);

  // 4. Associa fichas técnicas sem tenant
  const fichas = await prisma.fichaTecnica.updateMany({
    where: { cd_restaurante: null },
    data: { cd_restaurante: restaurante.cd_restaurante }
  });
  console.log(`Fichas técnicas atualizadas: ${fichas.count}`);

  // 5. Associa execuções de importação sem tenant
  const execucoes = await prisma.importacaoExecucao.updateMany({
    where: { cd_restaurante: null },
    data: { cd_restaurante: restaurante.cd_restaurante }
  });
  console.log(`Execuções de importação atualizadas: ${execucoes.count}`);

  await prisma.$disconnect();
  console.log("Seed de tenant concluído.");
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
