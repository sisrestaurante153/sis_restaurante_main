import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import {
  getAuthorizedPayment,
  getPayment,
  getPreapproval
} from "@/modules/billing/server/mercadopago-client";

// Mercado Pago envia eventos via POST com { type, data: { id } } — o payload
// não traz o recurso completo, é preciso buscar via API depois de validar a
// assinatura. Registrar em: Mercado Pago > Suas integrações > Webhooks >
// URL: https://<dominio>/api/mercadopago/webhook

interface MercadoPagoWebhookPayload {
  type: string;
  data: { id: string };
  entity?: string;
}

// Confirmado via "Simular notificação" do painel (2026-11-23): eventos de
// assinatura chegam com type "subscription_preapproval" (e entity
// "preapproval"), não "preapproval" como assumido na implementacao inicial -
// sem isso o evento era ignorado em silencio e a assinatura nunca mudava de
// status. Aceitar as duas formas porque a doc cita ambas.
const PREAPPROVAL_TYPES = ["preapproval", "subscription_preapproval"];

// O painel do Mercado Pago tem uma assinatura secreta por modo (teste e
// producao), e ambos os modos entregam na MESMA URL - entao a rota precisa
// aceitar qualquer um dos secrets configurados. MERCADOPAGO_WEBHOOK_SECRET
// aceita varios valores separados por virgula por causa disso.
function verifySignature(request: Request, payload: MercadoPagoWebhookPayload): boolean {
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const secrets = (process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (secrets.length === 0) {
    console.warn("MERCADOPAGO_WEBHOOK_SECRET não configurada nas variáveis de ambiente!");
    return false;
  }
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split("="))
  ) as { ts?: string; v1?: string };
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${payload.data?.id};request-id:${requestId};ts:${parts.ts};`;

  return secrets.some(
    (secret) => createHmac("sha256", secret).update(manifest).digest("hex") === parts.v1
  );
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

// Falha de email nunca deve derrubar o processamento do evento: o Mercado Pago
// reenviaria a notificacao e o pagamento seria reprocessado por um motivo que
// nao tem nada a ver com cobranca.
async function notifyPaymentConfirmed(gatewaySubscriptionId: string) {
  try {
    const contact = await getRestaurantContact(gatewaySubscriptionId);
    if (!contact) return;
    const { sendPaymentConfirmedEmail } = await import("@/modules/platform/email-service");
    await sendPaymentConfirmedEmail({
      email: contact.email,
      name: contact.name,
      restaurantName: contact.restaurantName,
      planLabel: planLabels[contact.plan] || contact.plan,
      value: contact.value
    });
  } catch (emailErr) {
    console.error("[mercadopago-webhook] erro ao enviar email de pagamento confirmado", emailErr);
  }
}

async function notifyOverdue(gatewaySubscriptionId: string, value: number) {
  try {
    const contact = await getRestaurantContact(gatewaySubscriptionId);
    if (!contact) return;
    const { sendOverdueEmail } = await import("@/modules/platform/email-service");
    await sendOverdueEmail({
      email: contact.email,
      name: contact.name,
      restaurantName: contact.restaurantName,
      dueDate: new Date().toLocaleDateString("pt-BR"),
      value
    });
  } catch (emailErr) {
    console.error("[mercadopago-webhook] erro ao enviar email de atraso", emailErr);
  }
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
    if (payload.type === "subscription_authorized_payment") {
      // data.id aqui e o id da FATURA, nao de um payment - buscar em
      // /v1/payments com ele retorna 404. A fatura e o unico recurso que
      // correlaciona o pagamento com a assinatura (preapproval_id).
      const invoice = await getAuthorizedPayment(payload.data.id);
      const gatewaySubscriptionId = invoice.preapproval_id;
      const paymentStatus = invoice.payment?.status ?? invoice.status;
      const paymentId = invoice.payment?.id ? String(invoice.payment.id) : String(invoice.id);
      const amount = Number(invoice.transaction_amount) || 0;

      const sub = await findLocalSubscriptionByGatewayId(gatewaySubscriptionId);

      if (sub && paymentStatus === "approved") {
        await repo.updateSubscriptionStatus(gatewaySubscriptionId, "active", 0);
        await repo.upsertPayment({
          subscriptionId: sub.id,
          gatewayPaymentId: paymentId,
          status: paymentStatus,
          paymentMethod: null,
          value: amount,
          dueDate: invoice.debit_date ? new Date(invoice.debit_date) : new Date(),
          paidAt: new Date()
        });
        await notifyPaymentConfirmed(gatewaySubscriptionId);
      } else if (sub && (paymentStatus === "rejected" || paymentStatus === "cancelled")) {
        await repo.updateSubscriptionStatus(gatewaySubscriptionId, "overdue", 1);
        await repo.upsertPayment({
          subscriptionId: sub.id,
          gatewayPaymentId: paymentId,
          status: paymentStatus,
          paymentMethod: null,
          value: amount,
          dueDate: invoice.debit_date ? new Date(invoice.debit_date) : new Date(),
          paidAt: null
        });
        await notifyOverdue(gatewaySubscriptionId, amount);
      }
      // demais status (scheduled, pending, etc.) sao intencionalmente ignorados
    } else if (payload.type === "payment") {
      // Pagamento avulso (PIX gerado por gerarCobrancaPixAction): a linha ja
      // existe no banco desde a criacao da cobranca, entao aqui so o status
      // muda. Nunca criar: nao ha como saber a assinatura por este evento.
      const payment = await getPayment(payload.data.id);
      const updated = await repo.updatePaymentStatusByGatewayId({
        gatewayPaymentId: payment.id,
        status: payment.status,
        paidAt:
          payment.status === "approved" && payment.date_approved ? new Date(payment.date_approved) : null
      });

      if (updated === 0) {
        console.warn(
          "[mercadopago-webhook] pagamento sem correspondencia local, ignorado",
          payment.id,
          payment.status
        );
      }
    } else if (PREAPPROVAL_TYPES.includes(payload.type) || payload.entity === "preapproval") {
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
