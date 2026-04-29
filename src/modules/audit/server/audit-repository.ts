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
              criadoEm: "desc"
            },
            include: {
              usuario: true
            }
          });

          return entries.map((entry) => ({
            id: entry.id,
            entity: entry.entidade as "item" | "ficha_tecnica" | "importacao",
            entityId: entry.entidadeId,
            entityLabel: entry.entidadeId,
            action: entry.acao,
            userId: entry.usuarioId,
            userName: entry.usuario?.nome ?? "Sistema",
            createdAt: entry.criadoEm.toISOString(),
            beforeSummary: entry.antesJson ? JSON.stringify(entry.antesJson) : null,
            afterSummary: entry.depoisJson ? JSON.stringify(entry.depoisJson) : null,
            beforeJson: entry.antesJson,
            afterJson: entry.depoisJson
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
