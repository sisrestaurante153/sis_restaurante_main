import type { SubscriptionStatus } from "./plans";

export function isSubscriptionBlocked(status: SubscriptionStatus, trialEndsAt: string | null): boolean {
  if (status === "cancelled" || status === "suspended") return true;
  if (status === "trial" && trialEndsAt) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(trialEndsAt);
    limit.setHours(0, 0, 0, 0);
    return today > limit;
  }
  return false;
}
