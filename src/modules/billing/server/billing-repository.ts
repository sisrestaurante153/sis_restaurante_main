import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import type {
  PlanCode,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  SubscriptionRecord,
  PaymentRecord
} from "@/modules/billing/domain/plans";
import { PLANS, TRIAL_DAYS } from "@/modules/billing/domain/plans";

function mapStatus(raw: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trial: "trial",
    active: "active",
    overdue: "overdue",
    cancelled: "cancelled",
    suspended: "suspended"
  };
  return map[raw] ?? "active";
}

export function getBillingRepository() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    throw new Error("Não foi possível conectar ao banco de dados.");
  }
  const db = prisma;

  return {
    async listSubscriptions(): Promise<SubscriptionRecord[]> {
      const rows = await db.assinatura.findMany({
        include: { restaurante: true },
        orderBy: { ts_criacao: "desc" }
      });

      return rows.map((row) => ({
        id: row.cd_assinatura,
        restaurantId: row.cd_restaurante,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        restaurantName: (row as any).restaurante.nm_restaurante,
        plan: row.tp_plano as PlanCode,
        status: mapStatus(row.tp_status),
        monthlyValue: Number(row.vl_mensal),
        nextBillingDate: row.ts_proximo_vencimento?.toISOString().split("T")[0] ?? null,
        trialEndsAt: row.ts_trial_fim?.toISOString().split("T")[0] ?? null,
        daysOverdue: row.nr_dias_inadimplente,
        asaasCustomerId: row.cd_asaas_customer,
        asaasSubscriptionId: row.cd_asaas_subscription
      }));
    },

    async listPayments(): Promise<PaymentRecord[]> {
      const rows = await db.pagamentoAsaas.findMany({
        include: {
          assinatura: { include: { restaurante: true } }
        },
        orderBy: { ts_vencimento: "desc" },
        take: 50
      });

      return rows.map((row) => ({
        id: row.cd_pagamento,
        subscriptionId: row.cd_assinatura,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: (row as any).assinatura.restaurante.nm_restaurante,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plan: (row as any).assinatura.tp_plano as PlanCode,
        asaasPaymentId: row.cd_asaas_payment,
        status: row.tp_status as PaymentStatus,
        paymentMethod: row.tp_forma_pagamento as PaymentMethod | null,
        value: Number(row.vl_pagamento),
        dueDate: row.ts_vencimento.toISOString().split("T")[0],
        paidAt: row.ts_pagamento?.toISOString().split("T")[0] ?? null
      }));
    },

    async getSubscriptionById(
      subscriptionId: string
    ): Promise<SubscriptionRecord | null> {
      const row = await db.assinatura.findUnique({
        where: { cd_assinatura: subscriptionId },
        include: { restaurante: true }
      });
      if (!row) return null;
      return {
        id: row.cd_assinatura,
        restaurantId: row.cd_restaurante,
        restaurantName: row.restaurante.nm_restaurante,
        plan: row.tp_plano as PlanCode,
        status: mapStatus(row.tp_status),
        monthlyValue: Number(row.vl_mensal),
        nextBillingDate: row.ts_proximo_vencimento?.toISOString().split("T")[0] ?? null,
        trialEndsAt: row.ts_trial_fim?.toISOString().split("T")[0] ?? null,
        daysOverdue: row.nr_dias_inadimplente,
        asaasCustomerId: row.cd_asaas_customer,
        asaasSubscriptionId: row.cd_asaas_subscription
      };
    },

    async getSubscriptionByRestaurant(
      restaurantId: string
    ): Promise<SubscriptionRecord | null> {
      const row = await db.assinatura.findUnique({
        where: { cd_restaurante: restaurantId },
        include: { restaurante: true }
      });
      if (!row) return null;
      return {
        id: row.cd_assinatura,
        restaurantId: row.cd_restaurante,
        restaurantName: row.restaurante.nm_restaurante,
        plan: row.tp_plano as PlanCode,
        status: mapStatus(row.tp_status),
        monthlyValue: Number(row.vl_mensal),
        nextBillingDate: row.ts_proximo_vencimento?.toISOString().split("T")[0] ?? null,
        trialEndsAt: row.ts_trial_fim?.toISOString().split("T")[0] ?? null,
        daysOverdue: row.nr_dias_inadimplente,
        asaasCustomerId: row.cd_asaas_customer,
        asaasSubscriptionId: row.cd_asaas_subscription
      };
    },

    async createTrialSubscription(
      restaurantId: string,
      plan: PlanCode
    ): Promise<SubscriptionRecord> {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
      const row = await db.assinatura.create({
        data: {
          cd_restaurante: restaurantId,
          tp_plano: plan,
          tp_status: "trial",
          vl_mensal: PLANS[plan].monthlyValue,
          ts_trial_fim: trialEndsAt
        },
        include: { restaurante: true }
      });
      return {
        id: row.cd_assinatura,
        restaurantId: row.cd_restaurante,
        restaurantName: row.restaurante.nm_restaurante,
        plan: row.tp_plano as PlanCode,
        status: "trial",
        monthlyValue: Number(row.vl_mensal),
        nextBillingDate: null,
        trialEndsAt: trialEndsAt.toISOString().split("T")[0],
        daysOverdue: 0,
        asaasCustomerId: null,
        asaasSubscriptionId: null
      };
    },

    async updateSubscriptionAsaasIds(
      subscriptionId: string,
      asaasCustomerId: string,
      asaasSubscriptionId: string,
      nextBillingDate: Date
    ): Promise<void> {
      await db.assinatura.update({
        where: { cd_assinatura: subscriptionId },
        data: {
          cd_asaas_customer: asaasCustomerId,
          cd_asaas_subscription: asaasSubscriptionId,
          tp_status: "active",
          ts_proximo_vencimento: nextBillingDate,
          ts_atualizacao: new Date()
        }
      });
    },

    async updateSubscriptionStatus(
      asaasSubscriptionId: string,
      status: SubscriptionStatus,
      daysOverdue = 0
    ): Promise<void> {
      await db.assinatura.updateMany({
        where: { cd_asaas_subscription: asaasSubscriptionId },
        data: {
          tp_status: status,
          nr_dias_inadimplente: daysOverdue,
          ts_atualizacao: new Date()
        }
      });
    },

    async updateSubscriptionPrice(
      subscriptionId: string,
      newValue: number
    ): Promise<void> {
      await db.assinatura.update({
        where: { cd_assinatura: subscriptionId },
        data: { vl_mensal: newValue, ts_atualizacao: new Date() }
      });
    },

    async upsertPayment(data: {
      subscriptionId: string;
      asaasPaymentId: string;
      status: string;
      paymentMethod: string | null;
      value: number;
      dueDate: Date;
      paidAt?: Date | null;
    }): Promise<void> {
      await db.pagamentoAsaas.upsert({
        where: { cd_asaas_payment: data.asaasPaymentId },
        create: {
          cd_assinatura: data.subscriptionId,
          cd_asaas_payment: data.asaasPaymentId,
          tp_status: data.status,
          tp_forma_pagamento: data.paymentMethod,
          vl_pagamento: data.value,
          ts_vencimento: data.dueDate,
          ts_pagamento: data.paidAt ?? null
        },
        update: {
          tp_status: data.status,
          ts_pagamento: data.paidAt ?? null
        }
      });
    },

    async listPlanConfigs() {
      return db.configuracaoPlano.findMany({
        where: { sn_ativo: true },
        orderBy: { vl_mensal: "asc" }
      });
    },

    async upsertPlanConfig(data: {
      ds_codigo: string;
      nm_plano: string;
      vl_mensal: number;
      ds_descricao: string;
      nr_limite_usuarios: number;
      nr_limite_itens: number;
      nr_limite_fichas: number;
    }): Promise<void> {
      await db.configuracaoPlano.upsert({
        where: { ds_codigo: data.ds_codigo },
        create: {
          ds_codigo: data.ds_codigo,
          nm_plano: data.nm_plano,
          vl_mensal: data.vl_mensal,
          ds_descricao: data.ds_descricao,
          nr_limite_usuarios: data.nr_limite_usuarios,
          nr_limite_itens: data.nr_limite_itens,
          nr_limite_fichas: data.nr_limite_fichas,
          sn_ativo: true
        },
        update: {
          nm_plano: data.nm_plano,
          vl_mensal: data.vl_mensal,
          ds_descricao: data.ds_descricao,
          nr_limite_usuarios: data.nr_limite_usuarios,
          nr_limite_itens: data.nr_limite_itens,
          nr_limite_fichas: data.nr_limite_fichas,
          ts_atualizacao: new Date()
        }
      });
    },

    async deletePlanConfig(code: string): Promise<void> {
      await db.configuracaoPlano.update({
        where: { ds_codigo: code },
        data: { sn_ativo: false, ts_atualizacao: new Date() }
      });
    },

    async ensureDefaultPlans(): Promise<void> {
      const count = await db.configuracaoPlano.count();
      if (count === 0) {
        const { PLANS } = await import("@/modules/billing/domain/plans");
        for (const plan of Object.values(PLANS)) {
          await db.configuracaoPlano.create({
            data: {
              ds_codigo: plan.code,
              nm_plano: plan.label,
              vl_mensal: plan.monthlyValue,
              ds_descricao: plan.description,
              nr_limite_usuarios: plan.limits.users,
              nr_limite_itens: plan.limits.items,
              nr_limite_fichas: plan.limits.fichas
            }
          });
        }
      }
    }
  };
}
