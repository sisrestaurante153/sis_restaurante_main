import type { PlanCode, PaymentMethod } from "@/modules/billing/domain/plans";

const ASAAS_BASE_URL = process.env.ASAAS_ENV === "production"
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

function getApiKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada.");
  return key;
}

async function asaasRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "access_token": getApiKey(),
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Asaas API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Tipos de resposta Asaas
// ---------------------------------------------------------------------------

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  status: string;
  cycle: string;
}

export interface AsaasPayment {
  id: string;
  subscription: string;
  status: string;
  value: number;
  dueDate: string;
  paymentDate?: string;
  billingType: string;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function createAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
}): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// ---------------------------------------------------------------------------
// Assinaturas
// ---------------------------------------------------------------------------

export async function createAsaasSubscription(data: {
  customer: string;
  billingType: PaymentMethod;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "MONTHLY";
  description: string;
}): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function cancelAsaasSubscription(
  subscriptionId: string
): Promise<void> {
  await asaasRequest(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

export async function updateAsaasSubscriptionValue(
  subscriptionId: string,
  value: number
): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({ value })
  });
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export async function listAsaasSubscriptionPayments(
  subscriptionId: string
): Promise<AsaasPayment[]> {
  const data = await asaasRequest<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments`
  );
  return data.data;
}

// ---------------------------------------------------------------------------
// Helpers de plano → valor
// ---------------------------------------------------------------------------

export function planToAsaasDescription(plan: PlanCode): string {
  const labels: Record<PlanCode, string> = {
    starter: "Custo de Receita — Plano Starter",
    pro: "Custo de Receita — Plano Pro",
    enterprise: "Custo de Receita — Plano Enterprise"
  };
  return labels[plan];
}
