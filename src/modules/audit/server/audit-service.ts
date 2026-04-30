import "server-only";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import {
  cloneDemoStore,
  createDemoId,
  getDemoStore,
  persistDemoStore,
  type DemoAuditRecord
} from "@/modules/platform/server/demo-data";
import { getServerEnv } from "@/modules/platform/server/env";

interface AuditRecordInput {
  actorId: string | null;
  actorName: string;
  entity: DemoAuditRecord["entity"];
  entityId: string;
  entityLabel: string;
  action: string;
  before?: unknown;
  after?: unknown;
}

interface CreateAuditServiceOptions {
  mode?: "auto" | "demo";
}

function buildAuditRecord(input: AuditRecordInput): DemoAuditRecord {
  return {
    id: createDemoId("audit"),
    entity: input.entity,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    action: input.action,
    userId: input.actorId,
    userName: input.actorName,
    createdAt: new Date().toISOString(),
    beforeSummary: input.before ? JSON.stringify(input.before) : null,
    afterSummary: input.after ? JSON.stringify(input.after) : null,
    beforeJson: input.before ?? null,
    afterJson: input.after ?? null
  };
}

export function createAuditService(options: CreateAuditServiceOptions = {}) {
  return {
    async record(input: AuditRecordInput) {
      const env = getServerEnv();
      const prisma = options.mode === "demo" ? null : getPrismaClient(env.DATABASE_URL);
      const entry = buildAuditRecord(input);

      if (prisma) {
        try {
          await prisma.auditoria.create({
            data: {
              cd_usuario: input.actorId,
              nm_entidade: input.entity,
              cd_entidade: input.entityId,
              ds_acao: input.action,
              js_antes: input.before ?? undefined,
              js_depois: input.after ?? undefined
            }
          });
        } catch {
          const store = getDemoStore();
          store.audits.unshift(entry);
          persistDemoStore(store);
          return cloneDemoStore(entry);
        }
      } else {
        const store = getDemoStore();
        store.audits.unshift(entry);
        persistDemoStore(store);
      }

      return cloneDemoStore(entry);
    },

    async listRecent() {
      return getDemoStore().audits
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((entry) => cloneDemoStore(entry));
    },

    async recordImportExecution(input: Omit<AuditRecordInput, "entity" | "action">) {
      return this.record({
        ...input,
        entity: "importacao",
        action: "import.executed"
      });
    },

    async recordRecalculation(input: Omit<AuditRecordInput, "action">) {
      return this.record({
        ...input,
        action: "cost.recalculated"
      });
    }
  };
}
