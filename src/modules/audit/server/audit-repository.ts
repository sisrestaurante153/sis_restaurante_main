import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { cloneDemoStore, getDemoStore } from "@/modules/platform/server/demo-data";
import { getServerEnv } from "@/modules/platform/server/env";

function mapAuditEntry(entry: {
  cd_auditoria: string;
  nm_entidade: string;
  cd_entidade: string;
  ds_acao: string;
  cd_usuario: string | null;
  usuario: { nm_usuario: string } | null;
  ts_criacao: Date;
  js_antes: unknown;
  js_depois: unknown;
}) {
  return {
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
  };
}

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
    },

    async listForEntity(entity: string, entityId: string) {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);

      if (prisma) {
        try {
          const entries = await prisma.auditoria.findMany({
            where: { nm_entidade: entity, cd_entidade: entityId },
            orderBy: { ts_criacao: "desc" },
            include: { usuario: true }
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

      return getDemoStore()
        .audits.filter((entry) => entry.entity === entity && entry.entityId === entityId)
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((entry) => cloneDemoStore(entry));
    },

    // Historico de movimentacoes (itens + fichas) da tela /historico —
    // acessivel pra qualquer restaurante, mas cada um só ve o proprio
    // historico. Excecao: super-admin (dono da plataforma) ve de TODOS os
    // restaurantes, sem filtro — mesmo alcance que /auditoria tinha, só que
    // agora unificado numa tela so em vez de duas. Auditoria nao tem coluna
    // de restaurante, entao o escopo por restaurante e feito filtrando pelas
    // entidades (item/ficha_tecnica) que realmente pertencem a ele. Registros
    // de "importacao"/"conflito" nao tem como ser escopados (tabelas sem
    // cd_restaurante) e ficam visiveis pra todos os papeis — aceitavel dado
    // que hoje o app opera com um unico restaurante padrao na pratica pra
    // essas entidades.
    async listHistorico(actor: { restaurantId: string; roleCodes: string[] }) {
      const env = getServerEnv();
      const prisma = getPrismaClient(env.DATABASE_URL);
      const isSuperAdmin = actor.roleCodes.includes("super-admin");

      if (prisma) {
        try {
          if (isSuperAdmin) {
            const entries = await prisma.auditoria.findMany({
              take: 200,
              orderBy: { ts_criacao: "desc" },
              include: { usuario: true }
            });
            return entries.map(mapAuditEntry);
          }

          const [entries, items, fichas] = await Promise.all([
            prisma.auditoria.findMany({
              take: 200,
              orderBy: { ts_criacao: "desc" },
              include: { usuario: true }
            }),
            prisma.item.findMany({ where: { cd_restaurante: actor.restaurantId }, select: { cd_item: true } }),
            prisma.fichaTecnica.findMany({ where: { cd_restaurante: actor.restaurantId }, select: { cd_ficha_tecnica: true } })
          ]);

          const itemIds = new Set(items.map((row) => row.cd_item));
          const fichaIds = new Set(fichas.map((row) => row.cd_ficha_tecnica));

          const scoped = entries.filter((entry) => {
            if (entry.nm_entidade === "item") return itemIds.has(entry.cd_entidade);
            if (entry.nm_entidade === "ficha_tecnica") return fichaIds.has(entry.cd_entidade);
            return true;
          });

          return scoped.map(mapAuditEntry);
        } catch {
          // Fallback demo em bootstrap local sem banco acessivel.
        }
      }

      return getDemoStore()
        .audits.slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((entry) => cloneDemoStore(entry));
    }
  };
}
