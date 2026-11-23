import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock do billing repository
const mockRepo = {
  updateSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
  upsertPayment: vi.fn().mockResolvedValue(undefined)
};

vi.mock("@/modules/billing/server/billing-repository", () => ({
  getBillingRepository: () => mockRepo
}));

// Mock do cliente Mercado Pago (busca do recurso completo após o evento)
const mockGetPayment = vi.fn();
const mockGetPreapproval = vi.fn();

vi.mock("@/modules/billing/server/mercadopago-client", () => ({
  getPayment: (id: string) => mockGetPayment(id),
  getPreapproval: (id: string) => mockGetPreapproval(id)
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
  });

  describe("type: payment", () => {
    it("pagamento de assinatura aprovado atualiza para 'active' e registra o pagamento", async () => {
      mockGetPayment.mockResolvedValue({
        id: "pay_1",
        status: "approved",
        transaction_amount: 99,
        date_approved: "2026-06-01T00:00:00Z",
        metadata: { preapproval_id: "mp_sub_1" }
      });

      await callWebhook({ type: "payment", data: { id: "pay_1" } });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "active", 0);
      expect(mockRepo.upsertPayment).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayPaymentId: "pay_1", status: "approved", value: 99 })
      );
    });

    it("pagamento de assinatura rejeitado marca 'overdue'", async () => {
      mockGetPayment.mockResolvedValue({
        id: "pay_2",
        status: "rejected",
        transaction_amount: 99,
        metadata: { preapproval_id: "mp_sub_1" }
      });

      await callWebhook({ type: "payment", data: { id: "pay_2" } });

      expect(mockRepo.updateSubscriptionStatus).toHaveBeenCalledWith("mp_sub_1", "overdue", 1);
    });

    it("pagamento PIX avulso (sem preapproval_id) só atualiza o status do próprio pagamento", async () => {
      mockGetPayment.mockResolvedValue({
        id: "pay_pix_1",
        status: "approved",
        transaction_amount: 99,
        date_approved: "2026-06-01T00:00:00Z"
      });

      await callWebhook({ type: "payment", data: { id: "pay_pix_1" } });

      expect(mockRepo.updateSubscriptionStatus).not.toHaveBeenCalled();
      expect(mockRepo.upsertPayment).toHaveBeenCalledWith(
        expect.objectContaining({ gatewayPaymentId: "pay_pix_1", status: "approved" })
      );
    });

    it("status pending não dispara nenhum efeito além do upsert sem assinatura", async () => {
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
