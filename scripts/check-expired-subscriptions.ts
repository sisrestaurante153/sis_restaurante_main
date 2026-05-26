import * as dotenv from "dotenv";
dotenv.config();

import { getPrismaClient } from "../src/modules/platform/infra/prisma";

async function main() {
  const prisma = getPrismaClient(process.env.DATABASE_URL);
  if (!prisma) {
    console.error("[Subscription Worker] Erro: Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  const now = new Date();
  console.log(`[Subscription Worker] Iniciando verificação de assinaturas expiradas em: ${now.toISOString()}`);

  try {
    // 1. Buscar e atualizar assinaturas com ts_proximo_vencimento vencido
    const expiredSubs = await prisma.assinatura.updateMany({
      where: {
        ts_proximo_vencimento: { lt: now },
        tp_status: { notIn: ["bloqueada", "cancelled", "suspended", "expirada"] as any }
      },
      data: {
        tp_status: "expirada" as any,
        ts_atualizacao: now
      }
    });

    // 2. Buscar e atualizar trials expirados (ts_trial_fim vencido e status = trial)
    const expiredTrials = await prisma.assinatura.updateMany({
      where: {
        ts_trial_fim: { lt: now },
        tp_status: "trial" as any
      },
      data: {
        tp_status: "expirada" as any,
        ts_atualizacao: now
      }
    });

    console.log(`[Subscription Worker] Processamento concluído com sucesso:`);
    console.log(`- Assinaturas vencidas atualizadas para 'expirada': ${expiredSubs.count}`);
    console.log(`- Trials vencidos atualizados para 'expirada': ${expiredTrials.count}`);
  } catch (err) {
    console.error("[Subscription Worker] Erro durante processamento das assinaturas:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
