import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { getPayment, getPreapproval } from "@/modules/billing/server/mercadopago-client";

// Mercado Pago envia eventos via POST com { type, data: { id } } — o payload
// não traz o recurso completo, é preciso buscar via API depois de validar a
// assinatura. Registrar em: Mercado Pago > Suas integrações > Webhooks >
// URL: https://<dominio>/api/mercadopago/webhook

interface MercadoPagoWebhookPayload {
  type: "payment" | "preapproval" | "subscription_authorized_payment" | string;
  data: { id: string };
}

function verifySignature(request: Request, payload: MercadoPagoWebhookPayload): boolean {
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET não configurada nas variáveis de ambiente!");
    return false;
  }
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("="))
  ) as { ts?: string; v1?: string };
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${payload.data?.id};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === parts.v1;
}

const planLabels: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise"
};

async function getRestaurantContact(gatewaySubscriptionId: string) {
  const { getPrismaClient } = await import("@/modules/platform/infra/prisma");
  const { getServerEnv } = await import("@/modules/platform/server/env");
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
  if (!prisma) return null;

  const subscription = await prisma.assinatura.findFirst({
    where: { cd_gateway_subscription: gatewaySubscriptionId },
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

async function findLocalSubscriptionByGatewayId(gatewaySubscriptionId: string) {
  const { getPrismaClient } = await import("@/modules/platform/infra/prisma");
  const { getServerEnv } = await import("@/modules/platform/server/env");
  const prisma = getPrismaClient(getServerEnv().DATABASE_URL);
  if (!prisma) return null;

  const row = await prisma.assinatura.findFirst({
    where: { cd_gateway_subscription: gatewaySubscriptionId }
  });
  return row ? { id: row.cd_assinatura } : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: MercadoPagoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!verifySignature(request, payload)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getBillingRepository();

  try {
    if (payload.type === "payment" || payload.type === "subscription_authorized_payment") {
      const payment = await getPayment(payload.data.id);

      // GAP CONHECIDO (ver spec, seção de judgment calls): a API real do
      // Mercado Pago precisa ser consultada para confirmar de qual campo do
      // objeto Payment extrair o id da assinatura (preapproval) relacionada
      // — não é payload.data.id, que é o id do próprio pagamento. Candidatos
      // a validar contra a doc oficial: payment.metadata.preapproval_id, ou
      // point_of_interaction.transaction_data.subscription_id. Até validar,
      // esta rota não consegue reconciliar pagamentos de assinatura
      // corretamente (apenas pagamentos PIX avulsos, que já carregam o
      // gatewayPaymentId correto via gerarCobrancaPixAction).
      const gatewaySubscriptionId: string | null =
        (payment as { metadata?: { preapproval_id?: string } }).metadata?.preapproval_id ?? null;

      if (!gatewaySubscriptionId) {
        // Pagamento sem assinatura associada (PIX avulso criado via
        // gerarCobrancaPixAction) — o upsertPayment original já foi feito
        // na criação; aqui só atualiza o status pelo gatewayPaymentId.
        await repo.upsertPayment({
          subscriptionId: "", // ignorado no update (where é por gatewayPaymentId)
          gatewayPaymentId: payment.id,
          status: payment.status,
          paymentMethod: "PIX",
          value: payment.transaction_amount,
          dueDate: new Date(),
          paidAt: payment.status === "approved" && payment.date_approved ? new Date(payment.date_approved) : null
        });
      } else if (payment.status === "approved") {
        const sub = await findLocalSubscriptionByGatewayId(gatewaySubscriptionId);
        if (sub) {
          await repo.updateSubscriptionStatus(gatewaySubscriptionId, "active", 0);
          await repo.upsertPayment({
            subscriptionId: sub.id,
            gatewayPaymentId: payment.id,
            status: payment.status,
            paymentMethod: null,
            value: payment.transaction_amount,
            dueDate: new Date(),
            paidAt: payment.date_approved ? new Date(payment.date_approved) : new Date()
          });

          try {
            const contact = await getRestaurantContact(gatewaySubscriptionId);
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
            console.error("[mercadopago-webhook] erro ao enviar email de pagamento confirmado", emailErr);
          }
        }
      } else if (payment.status === "rejected" || payment.status === "cancelled") {
        await repo.updateSubscriptionStatus(gatewaySubscriptionId, "overdue", 1);

        try {
          const contact = await getRestaurantContact(gatewaySubscriptionId);
          if (contact) {
            const { sendOverdueEmail } = await import("@/modules/platform/email-service");
            await sendOverdueEmail({
              email: contact.email,
              name: contact.name,
              restaurantName: contact.restaurantName,
              dueDate: new Date().toLocaleDateString("pt-BR"),
              value: payment.transaction_amount
            });
          }
        } catch (emailErr) {
          console.error("[mercadopago-webhook] erro ao enviar email de atraso", emailErr);
        }
      }
      // demais status (pending, in_process, etc.) são intencionalmente ignorados
    } else if (payload.type === "preapproval") {
      const preapproval = await getPreapproval(payload.data.id);

      if (preapproval.status === "cancelled") {
        await repo.updateSubscriptionStatus(preapproval.id, "cancelled");

        try {
          const contact = await getRestaurantContact(preapproval.id);
          if (contact) {
            const { sendBlockedEmail } = await import("@/modules/platform/email-service");
            await sendBlockedEmail({
              email: contact.email,
              name: contact.name,
              restaurantName: contact.restaurantName
            });
          }
        } catch (emailErr) {
          console.error("[mercadopago-webhook] erro ao enviar email de bloqueio", emailErr);
        }
      } else if (preapproval.status === "authorized") {
        await repo.updateSubscriptionStatus(preapproval.id, "active", 0);
      }
    }
  } catch (err) {
    console.error("[mercadopago-webhook] erro ao processar evento", payload.type, err);
    // Retorna 500 (diferente do Asaas) para o Mercado Pago reenviar o webhook
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
