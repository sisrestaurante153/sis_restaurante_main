-- Renomeia colunas e tabela especificas do Asaas para nomes agnosticos de gateway,
-- parte da migracao de billing para Mercado Pago (ver docs/superpowers/specs/2026-10-29-asaas-para-mercadopago-design.md).
-- Migracao greenfield: nenhuma assinatura real tem cd_asaas_customer/cd_asaas_subscription/cd_asaas_payment preenchidos.

ALTER TABLE "assinatura" RENAME COLUMN "cd_asaas_customer" TO "cd_gateway_customer";
ALTER TABLE "assinatura" RENAME COLUMN "cd_asaas_subscription" TO "cd_gateway_subscription";

ALTER TABLE "pagamento_asaas" RENAME COLUMN "cd_asaas_payment" TO "cd_gateway_payment";
ALTER TABLE "pagamento_asaas" RENAME TO "pagamento";
