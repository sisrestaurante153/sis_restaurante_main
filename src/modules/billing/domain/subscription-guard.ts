import type { SubscriptionStatus } from "./plans";

export function isSubscriptionBlocked(
  status: SubscriptionStatus,
  trialEndsAt: string | null,
  nextBillingDate?: string | null
): boolean {
  if (status === "bloqueada" || status === "cancelled" || status === "suspended" || status === "expirada" || status === "overdue") {
    return true;
  }

  const now = new Date();

  // Trial expirado: tp_status = "trial" e dt_fim_trial < now()
  if (status === "trial" && trialEndsAt) {
    const limit = new Date(trialEndsAt);
    return now > limit;
  }

  // dt_vencimento < now() — data de vencimento ultrapassada, mesmo que o status ainda não tenha sido atualizado
  if (nextBillingDate) {
    const limit = new Date(nextBillingDate);
    return now > limit;
  }

  return false;
}
