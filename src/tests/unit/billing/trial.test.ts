import { describe, expect, it } from "vitest";
import { TRIAL_DAYS, OVERDUE_TOLERANCE_DAYS, PLANS } from "@/modules/billing/domain/plans";

function trialEndsAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

describe("trial", () => {
  it(`TRIAL_DAYS é ${TRIAL_DAYS}`, () => {
    expect(TRIAL_DAYS).toBe(14);
  });

  it("data de fim do trial é 14 dias a partir da criação", () => {
    const criacao = new Date("2026-05-19T10:00:00.000Z");
    const fim = trialEndsAt(criacao);
    expect(fim.toISOString().startsWith("2026-06-02")).toBe(true);
  });

  it("trial não expirou no dia 13", () => {
    const criacao = new Date();
    const fim = trialEndsAt(criacao);
    const dia13 = new Date(criacao);
    dia13.setDate(dia13.getDate() + 13);
    expect(fim > dia13).toBe(true);
  });

  it("trial expirou depois do dia 14", () => {
    const criacao = new Date();
    const fim = trialEndsAt(criacao);
    const dia15 = new Date(criacao);
    dia15.setDate(dia15.getDate() + 15);
    expect(dia15 > fim).toBe(true);
  });
});

describe("tolerância de inadimplência", () => {
  it(`OVERDUE_TOLERANCE_DAYS é ${OVERDUE_TOLERANCE_DAYS}`, () => {
    expect(OVERDUE_TOLERANCE_DAYS).toBe(5);
  });
});

describe("planos", () => {
  it("starter existe com valor correto", () => {
    expect(PLANS.starter.monthlyValue).toBe(99);
  });

  it("pro existe com valor correto", () => {
    expect(PLANS.pro.monthlyValue).toBe(299);
  });

  it("enterprise existe com valor correto", () => {
    expect(PLANS.enterprise.monthlyValue).toBe(599);
  });

  it("todos os planos têm limites definidos", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.limits.users).toBeGreaterThan(0);
      expect(plan.limits.items).toBeGreaterThan(0);
      expect(plan.limits.fichas).toBeGreaterThan(0);
    }
  });

  it("enterprise tem mais capacidade que pro", () => {
    expect(PLANS.enterprise.limits.users).toBeGreaterThan(PLANS.pro.limits.users);
    expect(PLANS.enterprise.limits.items).toBeGreaterThan(PLANS.pro.limits.items);
  });
});
