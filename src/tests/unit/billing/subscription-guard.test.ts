import { describe, expect, it } from "vitest";
import { isSubscriptionBlocked } from "@/modules/billing/domain/subscription-guard";
import { TRIAL_DAYS } from "@/modules/billing/domain/plans";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

describe("isSubscriptionBlocked", () => {
  describe("trial", () => {
    it("não bloqueia enquanto o trial está ativo", () => {
      expect(isSubscriptionBlocked("trial", daysFromNow(7))).toBe(false);
    });

    it("não bloqueia no último dia do trial", () => {
      expect(isSubscriptionBlocked("trial", daysFromNow(0))).toBe(false);
    });

    it("bloqueia quando o trial expirou ontem", () => {
      expect(isSubscriptionBlocked("trial", daysFromNow(-1))).toBe(true);
    });

    it(`trial dura exatamente ${TRIAL_DAYS} dias`, () => {
      const trialEndsAt = daysFromNow(TRIAL_DAYS);
      expect(isSubscriptionBlocked("trial", trialEndsAt)).toBe(false);
    });

    it("bloqueia quando trial_ends_at está no passado distante", () => {
      expect(isSubscriptionBlocked("trial", "2020-01-01T00:00:00.000Z")).toBe(true);
    });

    it("não bloqueia trial sem data de fim configurada", () => {
      expect(isSubscriptionBlocked("trial", null)).toBe(false);
    });
  });

  describe("active", () => {
    it("não bloqueia assinatura ativa", () => {
      expect(isSubscriptionBlocked("active", null)).toBe(false);
    });

    it("não bloqueia assinatura ativa mesmo com data passada (campo ignorado)", () => {
      expect(isSubscriptionBlocked("active", "2020-01-01T00:00:00.000Z")).toBe(false);
    });
  });

  describe("overdue", () => {
    it("não bloqueia assinatura inadimplente (ainda dentro da tolerância)", () => {
      expect(isSubscriptionBlocked("overdue", null)).toBe(false);
    });
  });

  describe("cancelled / suspended", () => {
    it("bloqueia assinatura cancelada", () => {
      expect(isSubscriptionBlocked("cancelled", null)).toBe(true);
    });

    it("bloqueia assinatura suspensa", () => {
      expect(isSubscriptionBlocked("suspended", null)).toBe(true);
    });

    it("bloqueia cancelada mesmo com trialEndsAt no futuro (status prevalece)", () => {
      expect(isSubscriptionBlocked("cancelled", daysFromNow(10))).toBe(true);
    });
  });
});
