export type PlanCode = "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "trial" | "active" | "overdue" | "cancelled" | "suspended" | "bloqueada" | "expirada";
export type PaymentMethod = "CREDIT_CARD" | "PIX";
export type PaymentStatus = "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "PENDING";

export interface Plan {
  id?: string;
  code: string;
  label: string;
  monthlyValue: number;
  description: string;
  limits: {
    users: number;
    items: number;
    fichas: number;
  };
}

export const PLANS: Record<string, Plan> = {
  starter: {
    code: "starter",
    label: "Starter",
    monthlyValue: 99,
    description: "Ideal para restaurantes que estão começando.",
    limits: { users: 2, items: 200, fichas: 50 }
  },
  pro: {
    code: "pro",
    label: "Pro",
    monthlyValue: 299,
    description: "Para operações em crescimento com múltiplos usuários.",
    limits: { users: 10, items: 2000, fichas: 500 }
  },
  enterprise: {
    code: "enterprise",
    label: "Enterprise",
    monthlyValue: 599,
    description: "Sem limites, suporte prioritário e customizações.",
    limits: { users: 9999, items: 9999, fichas: 9999 }
  }
};

export const PLAN_LIST = Object.values(PLANS);

export const TRIAL_DAYS = 14;

export const OVERDUE_TOLERANCE_DAYS = 5;

export interface SubscriptionRecord {
  id: string;
  restaurantId: string;
  restaurantName: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  monthlyValue: number;
  nextBillingDate: string | null;
  trialEndsAt: string | null;
  daysOverdue: number;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
}

export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  tenant: string;
  plan: PlanCode;
  asaasPaymentId: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  value: number;
  dueDate: string;
  paidAt: string | null;
}
