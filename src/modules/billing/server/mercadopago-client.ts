import type { PlanCode } from "@/modules/billing/domain/plans";

const MERCADOPAGO_BASE_URL = "https://api.mercadopago.com";

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada.");
  return token;
}

async function mercadoPagoRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${MERCADOPAGO_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercado Pago API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Tipos de resposta Mercado Pago (apenas os campos usados pelos handlers)
// ---------------------------------------------------------------------------

export interface MercadoPagoPreapproval {
  id: string;
  init_point: string;
  status: string;
  payer_email: string;
}

export interface MercadoPagoPayment {
  id: string;
  status: string;
  transaction_amount: number;
  date_approved?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Assinaturas (Preapproval)
// ---------------------------------------------------------------------------

export async function createPreapprovalCheckout(data: {
  email: string;
  planCode: PlanCode;
  value: number;
  backUrl: string;
}): Promise<MercadoPagoPreapproval> {
  return mercadoPagoRequest<MercadoPagoPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: planToDescription(data.planCode),
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: data.value,
        currency_id: "BRL"
      },
      back_url: data.backUrl,
      payer_email: data.email,
      status: "pending"
    })
  });
}

export async function getPreapproval(id: string): Promise<MercadoPagoPreapproval> {
  return mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${id}`);
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export async function getPayment(id: string): Promise<MercadoPagoPayment> {
  return mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${id}`);
}

export async function createPixPayment(data: {
  amount: number;
  description: string;
  payerEmail: string;
}): Promise<MercadoPagoPayment> {
  return mercadoPagoRequest<MercadoPagoPayment>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      transaction_amount: data.amount,
      description: data.description,
      payment_method_id: "pix",
      payer: { email: data.payerEmail }
    })
  });
}

// ---------------------------------------------------------------------------
// Helpers de plano → descrição
// ---------------------------------------------------------------------------

export function planToDescription(plan: PlanCode): string {
  const labels: Record<PlanCode, string> = {
    starter: "Custo de Receita — Plano Starter",
    pro: "Custo de Receita — Plano Pro",
    enterprise: "Custo de Receita — Plano Enterprise"
  };
  return labels[plan];
}
