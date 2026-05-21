import type { SubscriptionStatus } from "./plans";

export function isSubscriptionBlocked(status: SubscriptionStatus, trialEndsAt: string | null): boolean {
  if (status === "cancelled" || status === "suspended") return true;
  if (status === "trial" && trialEndsAt) {
    return new Date(trialEndsAt) < new Date();
  }
  return false;
}
