import { NextResponse } from "next/server";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";

// Asaas envia eventos via POST com o header asaas-access-token
// Registrar em: Asaas > Integrações > Webhooks > URL: https://<dominio>/api/asaas/webhook

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    subscription: string;
    status: string;
    value: number;
    billingType: string;
    dueDate: string;
    paymentDate?: string;
    overdueInDays?: number;
  };
  subscription?: {
    id: string;
    status: string;
  };
}

function verifyToken(request: Request): boolean {
  const token = request.headers.get("asaas-access-token");
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    console.warn("ASAAS_WEBHOOK_TOKEN não configurada nas variáveis de ambiente!");
    return false;
  }
  return token === expected;
}

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise"
};

async function getRestaurantContact(asaasSubscriptionId: string) {
  const { getPrismaClient } = await import("@/modules/platform/infra/prisma");
  const { getServerEnv } = await import("@/modules/platform/server/env");
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
  if (!prisma) return null;

  const subscription = await prisma.assinatura.findFirst({
    where: { cd_asaas_subscription: asaasSubscriptionId },
    include: {
      restaurante: {
        include: {
          usuarios: {
            take: 1,
            orderBy: { ts_criacao: "asc" }
          }
        }
      }
    }
  });

  if (!subscription || !subscription.restaurante) return null;
  const user = subscription.restaurante.usuarios[0];
  if (!user) return null;

  return {
    email: user.ds_email,
    name: user.nm_usuario,
    restaurantName: subscription.restaurante.nm_restaurante,
    plan: subscription.tp_plano,
    status: subscription.tp_status,
    value: Number(subscription.vl_mensal)
  };
}

export async function POST(request: Request) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repo = getBillingRepository();

  try {
    switch (payload.event) {

      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const p = payload.payment;
        if (!p?.subscription) break;

        // Atualiza a assinatura para ativa
        await repo.updateSubscriptionStatus(p.subscription, "active", 0);

        // Registra o pagamento
        const sub = await prisma_findByAsaasId(p.subscription);
        if (sub) {
          await repo.upsertPayment({
            subscriptionId: sub.id,
            asaasPaymentId: p.id,
            status: p.status,
            paymentMethod: p.billingType,
            value: p.value,
            dueDate: new Date(p.dueDate),
            paidAt: p.paymentDate ? new Date(p.paymentDate) : new Date()
          });
        }

        // Dispara e-mail de confirmação de pagamento
        try {
          const contact = await getRestaurantContact(p.subscription);
          if (contact) {
            const { sendPaymentConfirmedEmail } = await import("@/modules/platform/email-service");
            await sendPaymentConfirmedEmail({
              email: contact.email,
              name: contact.name,
              restaurantName: contact.restaurantName,
              planLabel: planLabels[contact.plan] || contact.plan,
              value: contact.value
            });
          }
        } catch (emailErr) {
          console.error("[asaas-webhook] erro ao enviar email de pagamento confirmado", emailErr);
        }

        break;
      }

      case "PAYMENT_OVERDUE": {
        const p = payload.payment;
        if (!p?.subscription) break;

        await repo.updateSubscriptionStatus(
          p.subscription,
          "overdue",
          p.overdueInDays ?? 1
        );

        const sub = await prisma_findByAsaasId(p.subscription);
        if (sub) {
          await repo.upsertPayment({
            subscriptionId: sub.id,
            asaasPaymentId: p.id,
            status: "OVERDUE",
            paymentMethod: p.billingType,
            value: p.value,
            dueDate: new Date(p.dueDate),
            paidAt: null
          });
        }

        // Dispara e-mail de aviso de atraso
        try {
          const contact = await getRestaurantContact(p.subscription);
          if (contact) {
            const { sendOverdueEmail } = await import("@/modules/platform/email-service");
            const formattedDueDate = new Date(p.dueDate).toLocaleDateString("pt-BR");
            await sendOverdueEmail({
              email: contact.email,
              name: contact.name,
              restaurantName: contact.restaurantName,
              dueDate: formattedDueDate,
              value: p.value
            });
          }
        } catch (emailErr) {
          console.error("[asaas-webhook] erro ao enviar email de atraso", emailErr);
        }

        break;
      }

      case "SUBSCRIPTION_DELETED":
      case "PAYMENT_REFUNDED": {
        const subId = payload.subscription?.id ?? payload.payment?.subscription;
        if (subId) {
          await repo.updateSubscriptionStatus(subId, "cancelled");

          // Dispara e-mail de suspensão/bloqueio
          try {
            const contact = await getRestaurantContact(subId);
            if (contact) {
              const { sendBlockedEmail } = await import("@/modules/platform/email-service");
              await sendBlockedEmail({
                email: contact.email,
                name: contact.name,
                restaurantName: contact.restaurantName
              });
            }
          } catch (emailErr) {
            console.error("[asaas-webhook] erro ao enviar email de bloqueio", emailErr);
          }
        }
        break;
      }

      // Eventos ignorados intencionalmente
      case "PAYMENT_CREATED":
      case "PAYMENT_UPDATED":
      case "PAYMENT_AWAITING_RISK_ANALYSIS":
        break;
    }
  } catch (err) {
    console.error("[asaas-webhook] erro ao processar evento", payload.event, err);
    // Retorna 200 mesmo em erro interno para o Asaas não reenviar em loop
  }

  return NextResponse.json({ received: true });
}

// Busca a assinatura local pelo ID da assinatura no Asaas
async function prisma_findByAsaasId(asaasSubscriptionId: string) {
  const { getPrismaClient } = await import("@/modules/platform/infra/prisma");
  const { getServerEnv } = await import("@/modules/platform/server/env");
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
  if (!prisma) return null;

  const row = await prisma.assinatura.findFirst({
    where: { cd_asaas_subscription: asaasSubscriptionId }
  });
  return row ? { id: row.cd_assinatura } : null;
}
