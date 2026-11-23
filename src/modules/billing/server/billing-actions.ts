"use server";

import { z } from "zod";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { signUp, signInWithPassword } from "@/modules/access/server/auth-service";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { createPreapprovalCheckout, createPixPayment, planToDescription } from "@/modules/billing/server/mercadopago-client";
import { PLANS } from "@/modules/billing/domain/plans";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createUserSession } from "@/modules/access/server/session-cookie";

// ---------------------------------------------------------------------------
// Registro self-service
// ---------------------------------------------------------------------------

const registroSchema = z.object({
  nm_restaurante: z.string().min(2, "Informe o nome do restaurante."),
  nm_responsavel: z.string().min(2, "Informe o nome do responsável."),
  email: z.string().min(1, "Informe o email."),
  password: z.string().min(8, "Senha com no mínimo 8 caracteres."),
  plano: z.string().min(1, "Selecione um plano.")
});

export interface RegistroState {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export async function registrarRestauranteAction(
  _: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const parsed = registroSchema.safeParse({
    nm_restaurante: formData.get("nm_restaurante")?.toString(),
    nm_responsavel: formData.get("nm_responsavel")?.toString(),
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString(),
    plano: formData.get("plano")?.toString()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors
    };
  }

  const { nm_restaurante, nm_responsavel, email, password, plano } = parsed.data;

  // 1. Cria o usuário no Supabase Auth
  const authResult = await signUp(email, password, nm_responsavel);
  if (!authResult.ok) {
    return { status: "error", message: authResult.message };
  }

  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    throw new Error("Não foi possível conectar ao banco de dados.");
  }

  let restauranteId = "";
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  let success = false;

  try {
    // 2. Cria restaurante + usuário local + assinatura em trial numa transação
    await prisma.$transaction(async (tx) => {
      const restaurante = await tx.restaurante.create({
        data: { nm_restaurante, sn_ativo: true }
      });
      restauranteId = restaurante.cd_restaurante;

      await tx.user.create({
        data: {
          cd_usuario: authResult.user?.id ?? crypto.randomUUID(),
          nm_usuario: nm_responsavel,
          ds_email: email,
          sn_ativo: true,
          cd_restaurante: restaurante.cd_restaurante
        }
      });

      // Busca configuração do plano no banco
      const planConfig = await tx.configuracaoPlano.findUnique({
        where: { ds_codigo: plano }
      });

      const monthlyValue = planConfig ? planConfig.vl_mensal : (PLANS[plano] || PLANS.pro).monthlyValue;

      await tx.assinatura.create({
        data: {
          cd_restaurante: restaurante.cd_restaurante,
          tp_plano: plano,
          tp_status: "trial",
          vl_mensal: monthlyValue,
          ts_trial_fim: trialEndsAt
        }
      });
    });

    // Envia e-mail de boas-vindas assincronamente
    try {
      const { sendWelcomeEmail } = await import("@/modules/platform/email-service");
      sendWelcomeEmail({
        email,
        name: nm_responsavel,
        restaurantName: nm_restaurante
      }).catch(err => console.error("[registro] erro no sendWelcomeEmail catch", err));
    } catch (err) {
      console.error("[registro] erro ao carregar sendWelcomeEmail", err);
    }

    // 3. Loga o usuário imediatamente
    const loginResult = await signInWithPassword(email, password);
    if (!loginResult.ok) {
      return {
        status: "error",
        message: `Conta criada, mas não foi possível autenticar: ${loginResult.message}`
      };
    }

    // Cria cookies de sessão para o usuário local
    await createUserSession({
      userId: loginResult.user.id,
      restaurantId: restauranteId,
      email: loginResult.user.email,
      name: loginResult.user.nome,
      roleCodes: loginResult.user.roleCodes,
      subscriptionStatus: "trial",
      trialEndsAt: trialEndsAt.toISOString()
    });

    // Define o cookie sb-access-token para o Supabase
    const cookieStore = await cookies();
    cookieStore.set("sb-access-token", loginResult.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: loginResult.session.expires_in,
      path: "/",
    });

    success = true;
  } catch (err) {
    console.error("[registro] erro ao criar registros locais", err);
    return {
      status: "error",
      message: "Erro ao configurar a conta. Entre em contato com o suporte."
    };
  }

  if (success) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: "Conta criada com sucesso!"
  };
}

// ---------------------------------------------------------------------------
// Ativação paga — converte trial em assinatura real via Mercado Pago (cartão)
// ---------------------------------------------------------------------------

// O Mercado Pago recusa o preapproval com "Invalid value for back_url" quando
// a URL nao e publica - e foi exatamente o que aconteceu em producao usando
// env.APP_URL, que tem default http://localhost:3000 e passa na validacao do
// Zod sem ser utilizavel. Derivar do host da requisicao sempre reflete o
// dominio real por onde o cliente chegou, inclusive em preview deploys.
async function resolvePublicBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";

  if (host && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return `${proto}://${host}`;
  }

  return getServerEnv().APP_URL;
}

const ativarSchema = z.object({
  subscriptionId: z.string().min(1),
  nomeCliente: z.string().min(2, "Informe o nome completo."),
  email: z.string().email("Email inválido.")
});

export interface AtivarAssinaturaState {
  status: "idle" | "error" | "success";
  message?: string;
  initPoint?: string;
  errors?: Record<string, string[] | undefined>;
}

export async function ativarAssinaturaAction(
  _: AtivarAssinaturaState,
  formData: FormData
): Promise<AtivarAssinaturaState> {
  const parsed = ativarSchema.safeParse({
    subscriptionId: formData.get("subscriptionId")?.toString(),
    nomeCliente: formData.get("nomeCliente")?.toString(),
    email: formData.get("email")?.toString()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors
    };
  }

  const { subscriptionId, email } = parsed.data;

  const repo = getBillingRepository();
  const subscription = await repo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    return { status: "error", message: "Assinatura não encontrada." };
  }

  try {
    const backUrl = `${await resolvePublicBaseUrl()}/assinatura`;

    // Cria a cobrança recorrente (preapproval) no Mercado Pago — devolve um
    // link de checkout hospedado onde o cliente informa o cartão. O id do
    // cliente no Mercado Pago só fica disponível depois que o preapproval é
    // autorizado (via webhook), então gatewayCustomerId fica igual ao
    // gatewaySubscriptionId por ora, reconciliado quando o webhook chegar.
    const preapproval = await createPreapprovalCheckout({
      email,
      planCode: subscription.plan,
      value: subscription.monthlyValue,
      backUrl
    });

    await repo.updateGatewayIds(
      subscriptionId,
      preapproval.id,
      preapproval.id,
      (() => {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        return next;
      })()
    );

    return {
      status: "success",
      message: "Redirecionando para o checkout do Mercado Pago...",
      initPoint: preapproval.init_point
    };
  } catch (err) {
    console.error("[ativar-assinatura] erro", err);
    return {
      status: "error",
      message: "Erro ao ativar a assinatura. Tente novamente ou entre em contato com o suporte."
    };
  }
}

// ---------------------------------------------------------------------------
// Cobrança PIX avulsa (manual, sem recorrência nativa no Mercado Pago)
// ---------------------------------------------------------------------------

export interface GerarCobrancaPixState {
  status: "idle" | "error" | "success";
  message?: string;
  qrCode?: string;
  qrCodeBase64?: string;
}

export async function gerarCobrancaPixAction(
  subscriptionId: string,
  payerEmail: string
): Promise<GerarCobrancaPixState> {
  const repo = getBillingRepository();
  const subscription = await repo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    return { status: "error", message: "Assinatura não encontrada." };
  }

  try {
    const payment = await createPixPayment({
      amount: subscription.monthlyValue,
      description: planToDescription(subscription.plan),
      payerEmail
    });

    await repo.upsertPayment({
      subscriptionId,
      gatewayPaymentId: payment.id,
      status: "pending",
      paymentMethod: "PIX",
      value: subscription.monthlyValue,
      dueDate: new Date(),
      paidAt: null
    });

    const qrData = payment.point_of_interaction?.transaction_data;
    if (!qrData?.qr_code || !qrData?.qr_code_base64) {
      return { status: "error", message: "Mercado Pago não retornou o QR code do PIX." };
    }

    return {
      status: "success",
      qrCode: qrData.qr_code,
      qrCodeBase64: qrData.qr_code_base64
    };
  } catch (err) {
    console.error("[gerar-cobranca-pix] erro", err);
    return {
      status: "error",
      message: "Erro ao gerar a cobrança PIX. Tente novamente ou entre em contato com o suporte."
    };
  }
}

// ---------------------------------------------------------------------------
// Gerenciamento de Planos (Admin)
// ---------------------------------------------------------------------------

export async function getPlanConfigsAction() {
  const repo = getBillingRepository();
  await repo.ensureDefaultPlans();
  const rows = await repo.listPlanConfigs();
  return rows.map(r => ({
    id: r.cd_plano,
    code: r.ds_codigo,
    label: r.nm_plano,
    monthlyValue: Number(r.vl_mensal),
    description: r.ds_descricao,
    limits: {
      users: r.nr_limite_usuarios,
      items: r.nr_limite_itens,
      fichas: r.nr_limite_fichas
    }
  }));
}

const planSchema = z.object({
  code: z.string().min(2),
  label: z.string().min(2),
  monthlyValue: z.number().min(0),
  description: z.string().min(5),
  limits: z.object({
    users: z.number().int().min(1),
    items: z.number().int().min(1),
    fichas: z.number().int().min(1)
  })
});

export async function savePlanConfigAction(data: z.infer<typeof planSchema>) {
  const parsed = planSchema.safeParse(data);
  if (!parsed.success) throw new Error("Dados inválidos");

  const repo = getBillingRepository();
  await repo.upsertPlanConfig({
    ds_codigo: parsed.data.code,
    nm_plano: parsed.data.label,
    vl_mensal: parsed.data.monthlyValue,
    ds_descricao: parsed.data.description,
    nr_limite_usuarios: parsed.data.limits.users,
    nr_limite_itens: parsed.data.limits.items,
    nr_limite_fichas: parsed.data.limits.fichas
  });
}

export async function deletePlanConfigAction(code: string) {
  const repo = getBillingRepository();
  await repo.deletePlanConfig(code);
}
