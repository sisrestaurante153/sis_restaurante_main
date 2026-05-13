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
  if (!expected) return true; // sem token configurado, aceita (só usar em dev)
  return token === expected;
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
        break;
      }

      case "SUBSCRIPTION_DELETED":
      case "PAYMENT_REFUNDED": {
        const subId = payload.subscription?.id ?? payload.payment?.subscription;
        if (subId) {
          await repo.updateSubscriptionStatus(subId, "cancelled");
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
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL)! as any;
  const row = await prisma.assinatura.findFirst({
    where: { cd_asaas_subscription: asaasSubscriptionId }
  });
  return row ? { id: row.cd_assinatura } : null;
}
