# Migração do billing: Asaas → Mercado Pago

## Contexto

O módulo `billing` usa Asaas pra cobrança recorrente de assinatura SaaS (plano starter/pro/enterprise). Decisão: trocar o gateway para o Mercado Pago. Confirmado via query direta no banco que **nenhum restaurante tem dado real de assinatura Asaas hoje** — migração greenfield, sem risco de cliente ativo, sem necessidade de migração de dados.

Decisões confirmadas durante o brainstorming:
- Formas de pagamento mantidas: **cartão automático** (recorrência real) + **PIX avulso manual** (sem recorrência nativa de PIX no Mercado Pago).
- Captura de cartão: **redirect pro checkout hospedado do Mercado Pago** (`init_point`) — não implementamos tokenização de cartão no nosso próprio formulário.
- Código do Asaas: **removido por completo**, não mantido como fallback/flag.
- Credenciais do Mercado Pago ainda não existem — código fica pronto, envs entram depois.

## Arquitetura e fluxo de dados

**Cartão (recorrente):** usuário clica "Ativar assinatura" → servidor cria uma cobrança recorrente (`Preapproval`) no Mercado Pago, sem token de cartão → API devolve `init_point` → `ativarAssinaturaAction` retorna esse link pro client, que redireciona o navegador → usuário digita o cartão no site do Mercado Pago → ele autoriza a cobrança e volta pro nosso `back_url` → Mercado Pago manda webhooks (`preapproval` autorizado, depois `payment` a cada cobrança mensal) → nosso webhook busca o recurso completo via API (o evento só traz `type` + `id`, diferente do payload inline do Asaas) e atualiza status/datas.

**PIX (avulso, manual):** não existe PIX recorrente de verdade no Mercado Pago, então cada cobrança é gerada sob demanda. Botão **"Gerar cobrança PIX deste mês"** na tela de administração da assinatura cria um pagamento PIX avulso (`POST /v1/payments`) e mostra o QR code/código copia-e-cola na hora. Confirmação chega depois pelo mesmo webhook.

## Componentes

**Novo `src/modules/billing/server/mercadopago-client.ts`** — fetch puro (sem SDK oficial), mesma forma do `asaas-client.ts` que substitui:
- `MERCADOPAGO_BASE_URL = "https://api.mercadopago.com"`, `getAccessToken()` lê `MERCADOPAGO_ACCESS_TOKEN`
- `createPreapprovalCheckout({ email, planCode, backUrl })` → cria a cobrança recorrente, devolve `init_point`
- `getPreapproval(id)` / `getPayment(id)` → busca o recurso completo (webhook só manda o ID)
- `createPixPayment({ amount, description, payerEmail })` → `POST /v1/payments` com `payment_method_id: "pix"`, devolve `point_of_interaction.transaction_data.qr_code_base64`

**`src/app/api/mercadopago/webhook/route.ts`** (substitui `/api/asaas/webhook`):
- Verifica assinatura via `x-signature`/`x-request-id` (HMAC com `MERCADOPAGO_WEBHOOK_SECRET`), diferente do token estático do Asaas
- Recebe `{ type, data: { id } }`, busca o recurso completo e despacha pros mesmos handlers de efeito já existentes (ativar/marcar pago/marcar atrasado/cancelar) — lógica de negócio de cada handler não muda, só a fonte do evento

**Schema (`prisma/schema.prisma`)** — migração renomeando colunas Asaas-específicas pra genéricas:
- `Assinatura.cd_asaas_customer` → `cd_gateway_customer`
- `Assinatura.cd_asaas_subscription` → `cd_gateway_subscription`
- Model `PagamentoAsaas` → `Pagamento`, `cd_asaas_payment` → `cd_gateway_payment`
- Demais campos (`tp_status`, `vl_pagamento`, etc.) ficam intactos

**`billing-repository.ts`** — mesma forma dos métodos, só troca nomes/campos internos: `updateSubscriptionAsaasIds` → `updateGatewayIds`, `updateSubscriptionStatus` e `upsertPayment` passam a operar sobre os campos renomeados.

**`ativarAssinaturaAction`:** troca `createAsaasCustomer`→`createAsaasSubscription` por uma chamada a `createPreapprovalCheckout`, que devolve `init_point`. A action passa a retornar esse link pro client em vez de só `{ success: true }` — a UI (`assinatura/page.tsx`) redireciona o navegador pra lá. `paymentMethod: "PIX"` sai do enum dessa action (PIX não é mais parte de "ativar assinatura").

**Nova `gerarCobrancaPixAction`:** recebe `subscriptionId`, chama `createPixPayment` com `vl_mensal` da assinatura, salva o pagamento como `pending` em `Pagamento`, devolve o QR code pra UI exibir no botão de PIX avulso.

**Removidos por completo:** `asaas-client.ts`, `src/app/api/asaas/webhook/route.ts`. Atualizados: `billing-actions.ts`, `src/middleware.ts` (rota do matcher trocada pra `/api/mercadopago/webhook`), `src/app/(app)/assinatura/page.tsx` e `src/app/(app)/billing/page.tsx` (textos de UI que citam Asaas), `src/modules/billing/domain/plans.ts` (se citar Asaas em tipos/comentários).

## Tratamento de erro

- `createPreapprovalCheckout`/`createPixPayment` falhando (rede, credencial inválida) → action retorna erro explícito pro usuário, mesmo padrão que já existia com o Asaas.
- Webhook com assinatura HMAC inválida → 401 direto, sem processar.
- Webhook recebendo evento válido mas falhando ao buscar o recurso completo (`getPreapproval`/`getPayment`) → loga e retorna 500; Mercado Pago reenvia o webhook automaticamente em retry, então não precisa de fila própria.
- Variáveis de ambiente novas (substituem as do Asaas): `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`. Credenciais reais ainda não existem — código fica pronto, envs entram quando o usuário as fornecer.

## Testes

- `src/tests/unit/billing/webhook.test.ts` reescrito pro novo formato de evento (`type`/`id` + fetch mockado do recurso completo + verificação HMAC), mesma cobertura de casos (confirmado, atrasado, cancelado), só trocando a fonte do evento.
- Sem teste de integração novo necessário — greenfield, sem dado real de assinatura em produção.

## Fora de escopo

- Tokenização de cartão no nosso próprio formulário (fluxo é redirect pro checkout hospedado).
- PIX recorrente automático (não existe nativamente no Mercado Pago; fica manual/avulso).
- Qualquer migração de dado existente (não há dado real de assinatura Asaas em produção).
