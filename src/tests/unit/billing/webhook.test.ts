import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock do billing repository
const mockRepo = {
  updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
  upsertPayment: vi.fn().mockResolvedValue(undefined),
  updatePaymentStatusByGatewayId: vi.fn().mockResolvedValue(1)
};

vi.mock("@/modules/billing/server/billing-repository", () => ({
  getBillingRepository: () => mockRepo
}));

// Mock do cliente Mercado Pago (busca do recurso completo após o evento)
const mockGetPayment = vi.fn();
const mockGetPreapproval = vi.fn();
const mockGetAuthorizedPayment = vi.fn();

vi.mock("@/modules/billing/server/mercadopago-client", () => ({
  getPayment: (id: string) => mockGetPayment(id),
  getPreapproval: (id: string) => mockGetPreapproval(id),
  getAuthorizedPayment: (id: string) => mockGetAuthorizedPayment(id)
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

const WEBHOOK_SECRET = "token-secreto";

function buildSignatureHeader(dataId: string, requestId: string, secret = WEBHOOK_SECRET) {
  const ts = Date.now().toString();
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

async function callWebhook(body: { type: string; data: { id: string } }, opts?: { invalidSignature?: boolean; noSecret?: boolean }) {
  const { POST } = await import("@/app/api/mercadopago/webhook/route");
  const requestId = "req-1";
  const headers: Record<string, string> = { "content-type": "application/json" };

  if (!opts?.noSecret) {
    headers["x-signature"] = opts?.invalidSignature
      ? buildSignatureHeader(body.data.id, requestId, "chave-errada")
      : buildSignatureHeader(body.data.id, requestId);
    headers["x-request-id"] = requestId;
  }

  const request = new Request("http://localhost/api/mercadopago/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  return POST(request);
}

describe("webhook Mercado Pago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  describe("autenticação", () => {
    it("rejeita quando MERCADOPAGO_WEBHOOK_SECRET não está configurada", async () => {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
      const res = await callWebhook({ type: "payment", data: { id: "pay_1" } });
      expect(res.status).toBe(401);
    });

    it("rejeita assinatura inválida com 401", async () => {
      const res = await callWebhook({ type: "payment", data: { id: "pay_1" } }, { invalidSignature: true });
      expect(res.status).toBe(401);
      expect(mockGetPayment).not.toHaveBeenCalled();
    });

    it("rejeita requisição sem header de assinatura", async () => {
      const res = await callWebhook({ type: "payment", data: { id: "pay_1" } }, { noSecret: true });
      expect(res.status).toBe(401);
    });

    it("aceita assinatura correta", async () => {
      mockGetPayment.mockResolvedValue({ id: "pay_1", status: "pending", transaction_amount: 99 });
      const res = await callWebhook({ type: "payment", data: { id: "pay_1" } });
      expect(res.status).toBe(200);
    });

    // O painel do Mercado Pago gera um secret por modo (teste e producao) e os
    // dois entregam na mesma URL, entao a rota aceita varios separados por virgula.
    it("aceita qualquer um dos secrets quando ha mais de um configurado", async () => {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = `secret-do-outro-modo,${WEBHOOK_SECRET}`;
      mockGetPayment.mockResolvedValue({ id: "pay_1", status: "pending", transaction_amount: 99 });

      const res = await callWebhook({ type: "payment", data: { id: "pay_1" } });

      expect(res.status).toBe(200);
    });

    it("rejeita assinatura que nao bate com nenhum dos secrets configurados", async () => {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = "secret-a,secret-b";

      const res = await callWebhook({ type: "payment", data: { id: "pay_1" } });

      expect(res.status).toBe(401);
      expect(mockGetPayment).not.toHaveBeenCalled();
    });
  });

  // Cobranca recorrente da assinatura. O data.id e o id da FATURA
  // (/authorized_payments), nao de um payment - e so a fatura carrega o
  // preapproval_id que liga o pagamento a assinatura.
  describe("type: subscription_authorized_payment", () => {
    it("fatura aprovada atualiza para 'active' e registra o pagamento da assinatura", async () => {
      mockGetAuthorizedPayment.mockResolvedValue({
        id: 6114264375,
        preapproval_id: "mp_sub_1",
        transaction_amount: "299.00",
        status: "processed",
        debit_date: "2026-11-23T11:12:25.892-04:00",
        payment: { id: 19951521071, status: "approved", status_detail: "accredited" }
      });

      await callWebhook({ type: "subscription_authorized_payment", data: { id: "invoice_1" } });

      expect(mockGetAuthorizedPayment).toHaveBeenCalledWith("invoice_1");
      expect(mockGetPayment).not.toHaveBeenCalled();
      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "active", 0);
      expect(mockRepo.upsertPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: "sub-local-1",
          gatewayPaymentId: "19951521071",
          status: "approved",
          value: 299
        })
      );
    });

    it("fatura recusada marca 'overdue' e registra o pagamento sem data de pagamento", async () => {
      mockGetAuthorizedPayment.mockResolvedValue({
        id: 6114264376,
        preapproval_id: "mp_sub_1",
        transaction_amount: "299.00",
        status: "recycling",
        payment: { id: 19951521072, status: "rejected" }
      });

      await callWebhook({ type: "subscription_authorized_payment", data: { id: "invoice_2" } });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "overdue", 1);
      expect(mockRepo.upsertPayment).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayPaymentId: "19951521072", status: "rejected", paidAt: null })
      );
    });

    it("fatura ainda agendada nao mexe na assinatura", async () => {
      mockGetAuthorizedPayment.mockResolvedValue({
        id: 6114264377,
        preapproval_id: "mp_sub_1",
        transaction_amount: "299.00",
        status: "scheduled",
        payment: { id: 19951521073, status: "pending" }
      });

      await callWebhook({ type: "subscription_authorized_payment", data: { id: "invoice_3" } });

      expect(mockRepo.updateSubscriptionStatus).not.toHaveBeenCalled();
      expect(mockRepo.upsertPayment).not.toHaveBeenCalled();
    });
  });

  describe("type: payment", () => {
    // PIX avulso: a linha ja existe desde a geracao da cobranca, entao o evento
    // so muda o status. Criar aqui violaria a FK, porque este evento nao diz a
    // qual assinatura o pagamento pertence.
    it("pagamento avulso so atualiza o status pelo id do gateway", async () => {
      mockGetPayment.mockResolvedValue({
        id: "pay_pix_1",
        status: "approved",
        transaction_amount: 99,
        date_approved: "2026-06-01T00:00:00Z"
      });

      await callWebhook({ type: "payment", data: { id: "pay_pix_1" } });

      expect(mockRepo.updateSubscriptionStatus).not.toHaveBeenCalled();
      expect(mockRepo.upsertPayment).not.toHaveBeenCalled();
      expect(mockRepo.updatePaymentStatusByGatewayId).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayPaymentId: "pay_pix_1", status: "approved" })
      );
    });

    it("pagamento sem correspondencia local responde 200 sem quebrar", async () => {
      mockRepo.updatePaymentStatusByGatewayId.mockResolvedValueOnce(0);
      mockGetPayment.mockResolvedValue({ id: "pay_orfao", status: "approved", transaction_amount: 99 });

      const res = await callWebhook({ type: "payment", data: { id: "pay_orfao" } });

      expect(res.status).toBe(200);
      expect(mockRepo.upsertPayment).not.toHaveBeenCalled();
    });

    it("status pending nao mexe na assinatura", async () => {
      mockGetPayment.mockResolvedValue({ id: "pay_3", status: "pending", transaction_amount: 99 });

      await callWebhook({ type: "payment", data: { id: "pay_3" } });

      expect(mockRepo.updateSubscriptionStatus).not.toHaveBeenCalled();
    });
  });

  describe("type: preapproval", () => {
    it("autorizado atualiza para 'active'", async () => {
      mockGetPreapproval.mockResolvedValue({ id: "mp_sub_1", status: "authorized", init_point: "", payer_email: "" });

      await callWebhook({ type: "preapproval", data: { id: "mp_sub_1" } });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "active", 0);
    });

    it("cancelado atualiza para 'cancelled'", async () => {
      mockGetPreapproval.mockResolvedValue({ id: "mp_sub_1", status: "cancelled", init_point: "", payer_email: "" });

      await callWebhook({ type: "preapproval", data: { id: "mp_sub_1" } });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "cancelled");
    });

    // O painel manda type "subscription_preapproval" (confirmado via
    // "Simular notificação" em 2026-11-23), nao "preapproval" - tratar so o
    // segundo fazia o evento ser ignorado em silencio, com 200 enganoso.
    it("trata 'subscription_preapproval', que e o tipo real enviado pelo Mercado Pago", async () => {
      mockGetPreapproval.mockResolvedValue({ id: "mp_sub_1", status: "authorized", init_point: "", payer_email: "" });

      await callWebhook({ type: "subscription_preapproval", data: { id: "mp_sub_1" } });

      expect(mockGetPreapproval).toHaveBeenCalledWith("mp_sub_1");
      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "active", 0);
    });
  });

  describe("payload inválido / falha ao buscar o recurso", () => {
    it("retorna 400 para JSON inválido", async () => {
      const { POST } = await import("@/app/api/mercadopago/webhook/route");
      const request = new Request("http://localhost/api/mercadopago/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": "ts=1,v1=x", "x-request-id": "r1" },
        body: "não é json"
      });
      const res = await POST(request);
      expect(res.status).toBe(400);
    });

    it("retorna 500 quando getPayment falha (diferente do comportamento antigo do Asaas, que sempre dava 200)", async () => {
      mockGetPayment.mockRejectedValue(new Error("timeout"));
      const res = await callWebhook({ type: "payment", data: { id: "pay_err" } });
      expect(res.status).toBe(500);
    });
  });
});
