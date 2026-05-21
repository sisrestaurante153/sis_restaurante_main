import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock do billing repository
const mockRepo = {
  updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
  upsertPayment: vi.fn().mockResolvedValue(undefined)
};

vi.mock("@/modules/billing/server/billing-repository", () => ({
  getBillingRepository: () => mockRepo
}));

// Mock do prisma usado internamente na route
vi.mock("@/modules/platform/infra/prisma", () => ({
  getPrismaClient: () => ({
    assinatura: {
      findFirst: vi.fn().mockResolvedValue({ cd_assinatura: "sub-local-1" })
    }
  })
}));

vi.mock("@/modules/platform/server/env", () => ({
  getServerEnv: () => ({ DATABASE_URL: "postgresql://test" })
}));

async function callWebhook(body: object, token?: string) {
  const { POST } = await import("@/app/api/asaas/webhook/route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["asaas-access-token"] = token;
  const request = new Request("http://localhost/api/asaas/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  return POST(request);
}

describe("webhook Asaas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ASAAS_WEBHOOK_TOKEN;
  });

  describe("autenticação", () => {
    it("aceita requisição sem token quando ASAAS_WEBHOOK_TOKEN não está configurado", async () => {
      const res = await callWebhook({ event: "PAYMENT_CREATED" });
      expect(res.status).toBe(200);
    });

    it("rejeita token inválido com 401", async () => {
      process.env.ASAAS_WEBHOOK_TOKEN = "token-secreto";
      const res = await callWebhook({ event: "PAYMENT_CREATED" }, "token-errado");
      expect(res.status).toBe(401);
    });

    it("aceita token correto", async () => {
      process.env.ASAAS_WEBHOOK_TOKEN = "token-secreto";
      const res = await callWebhook({ event: "PAYMENT_CREATED" }, "token-secreto");
      expect(res.status).toBe(200);
    });
  });

  describe("PAYMENT_CONFIRMED", () => {
    it("atualiza assinatura para 'active'", async () => {
      await callWebhook({
        event: "PAYMENT_CONFIRMED",
        payment: {
          id: "pay_1",
          subscription: "asaas_sub_1",
          status: "CONFIRMED",
          value: 99,
          billingType: "CREDIT_CARD",
          dueDate: "2026-06-01",
          paymentDate: "2026-06-01"
        }
      });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("asaas_sub_1", "active", 0);
    });

    it("registra o pagamento", async () => {
      await callWebhook({
        event: "PAYMENT_CONFIRMED",
        payment: {
          id: "pay_1",
          subscription: "asaas_sub_1",
          status: "CONFIRMED",
          value: 99,
          billingType: "CREDIT_CARD",
          dueDate: "2026-06-01",
          paymentDate: "2026-06-01"
        }
      });

      expect(mockRepo.upsertPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          asaasPaymentId: "pay_1",
          status: "CONFIRMED",
          value: 99
        })
      );
    });
  });

  describe("PAYMENT_RECEIVED", () => {
    it("também atualiza para 'active'", async () => {
      await callWebhook({
        event: "PAYMENT_RECEIVED",
        payment: {
          id: "pay_2",
          subscription: "asaas_sub_1",
          status: "RECEIVED",
          value: 99,
          billingType: "PIX",
          dueDate: "2026-06-01"
        }
      });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("asaas_sub_1", "active", 0);
    });
  });

  describe("PAYMENT_OVERDUE", () => {
    it("atualiza assinatura para 'overdue' com dias corretos", async () => {
      await callWebhook({
        event: "PAYMENT_OVERDUE",
        payment: {
          id: "pay_3",
          subscription: "asaas_sub_1",
          status: "OVERDUE",
          value: 99,
          billingType: "CREDIT_CARD",
          dueDate: "2026-05-01",
          overdueInDays: 3
        }
      });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("asaas_sub_1", "overdue", 3);
    });

    it("usa 1 dia quando overdueInDays não é informado", async () => {
      await callWebhook({
        event: "PAYMENT_OVERDUE",
        payment: {
          id: "pay_4",
          subscription: "asaas_sub_1",
          status: "OVERDUE",
          value: 99,
          billingType: "CREDIT_CARD",
          dueDate: "2026-05-01"
        }
      });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("asaas_sub_1", "overdue", 1);
    });
  });

  describe("SUBSCRIPTION_DELETED", () => {
    it("cancela a assinatura", async () => {
      await callWebhook({
        event: "SUBSCRIPTION_DELETED",
        subscription: { id: "asaas_sub_1", status: "DELETED" }
      });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("asaas_sub_1", "cancelled");
    });
  });

  describe("PAYMENT_REFUNDED", () => {
    it("cancela a assinatura", async () => {
      await callWebhook({
        event: "PAYMENT_REFUNDED",
        payment: {
          id: "pay_5",
          subscription: "asaas_sub_1",
          status: "REFUNDED",
          value: 99,
          billingType: "PIX",
          dueDate: "2026-06-01"
        }
      });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("asaas_sub_1", "cancelled");
    });
  });

  describe("eventos ignorados", () => {
    it.each(["PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_AWAITING_RISK_ANALYSIS"])(
      "não chama o repositório para evento %s",
      async (event) => {
        await callWebhook({ event });
        expect(mockRepo.updateSubscriptionStatus).not.toHaveBeenCalled();
        expect(mockRepo.upsertPayment).not.toHaveBeenCalled();
      }
    );
  });

  describe("payload inválido", () => {
    it("retorna 400 para JSON inválido", async () => {
      const { POST } = await import("@/app/api/asaas/webhook/route");
      const request = new Request("http://localhost/api/asaas/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "não é json"
      });
      const res = await POST(request);
      expect(res.status).toBe(400);
    });

    it("retorna 200 mesmo sem payment.subscription (não quebra)", async () => {
      const res = await callWebhook({
        event: "PAYMENT_CONFIRMED",
        payment: { id: "pay_x", status: "CONFIRMED", value: 99, billingType: "PIX", dueDate: "2026-06-01" }
      });
      expect(res.status).toBe(200);
      expect(mockRepo.updateSubscriptionStatus).not.toHaveBeenCalled();
    });
  });
});
