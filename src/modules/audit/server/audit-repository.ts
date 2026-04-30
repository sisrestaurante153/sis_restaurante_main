import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { cloneDemoStore, getDemoStore } from "@/modules/platform/server/demo-data";
import { getServerEnv } from "@/modules/platform/server/env";

export function getAuditRepository() {
  return {
    async listRecentActivity() {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        try {
          const entries = await prisma.auditoria.findMany({
            take: 50,
            orderBy: {
              ts_criacao: "desc"
            },
            include: {
              usuario: true
            }
          });

          return entries.map((entry) => ({
            id: entry.cd_auditoria,
            entity: entry.nm_entidade as "item" | "ficha_tecnica" | "importacao",
            entityId: entry.cd_entidade,
            entityLabel: entry.cd_entidade,
            action: entry.ds_acao,
            userId: entry.cd_usuario,
            userName: entry.usuario?.nm_usuario ?? "Sistema",
            createdAt: entry.ts_criacao.toISOString(),
            beforeSummary: entry.js_antes ? JSON.stringify(entry.js_antes) : null,
            afterSummary: entry.js_depois ? JSON.stringify(entry.js_depois) : null,
            beforeJson: entry.js_antes,
            afterJson: entry.js_depois
          }));
        } catch {
          // Fallback demo em bootstrap local sem banco acessivel.
        }
      }

      return getDemoStore().audits
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((entry) => cloneDemoStore(entry));
    }
  };
}
