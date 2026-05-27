"use server";

import { z } from "zod";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { signUp, signInWithPassword } from "@/modules/access/server/auth-service";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { createAsaasCustomer, createAsaasSubscription, planToAsaasDescription } from "@/modules/billing/server/asaas-client";
import type { PaymentMethod } from "@/modules/billing/domain/plans";
import { PLANS } from "@/modules/billing/domain/plans";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
// Ativação paga — converte trial em assinatura real via Asaas
// ---------------------------------------------------------------------------

const ativarSchema = z.object({
  subscriptionId: z.string().min(1),
  nomeCliente: z.string().min(2, "Informe o nome completo."),
  email: z.string().email("Email inválido."),
  cpfCnpj: z.string().min(11, "CPF ou CNPJ inválido.").max(18),
  paymentMethod: z.enum(["CREDIT_CARD", "PIX"])
});

export interface AtivarAssinaturaState {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export async function ativarAssinaturaAction(
  _: AtivarAssinaturaState,
  formData: FormData
): Promise<AtivarAssinaturaState> {
  const parsed = ativarSchema.safeParse({
    subscriptionId: formData.get("subscriptionId")?.toString(),
    nomeCliente: formData.get("nomeCliente")?.toString(),
    email: formData.get("email")?.toString(),
    cpfCnpj: formData.get("cpfCnpj")?.toString()?.replace(/\D/g, ""),
    paymentMethod: formData.get("paymentMethod")?.toString()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors
    };
  }

  const { subscriptionId, nomeCliente, email, cpfCnpj, paymentMethod } = parsed.data;

  const repo = getBillingRepository();
  const subscription = await repo.getSubscriptionById(subscriptionId);
  if (!subscription) {
    return { status: "error", message: "Assinatura não encontrada." };
  }

  try {
    // 1. Cria o cliente no Asaas
    const customer = await createAsaasCustomer({
      name: nomeCliente,
      email,
      cpfCnpj
    });

    // 2. Cria a assinatura no Asaas
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

    const asaasSubscription = await createAsaasSubscription({
      customer: customer.id,
      billingType: paymentMethod as PaymentMethod,
      value: subscription.monthlyValue,
      nextDueDate: nextDueDateStr,
      cycle: "MONTHLY",
      description: planToAsaasDescription(subscription.plan)
    });

    // 3. Atualiza o banco local com os IDs do Asaas
    await repo.updateSubscriptionAsaasIds(
      subscriptionId,
      customer.id,
      asaasSubscription.id,
      new Date(asaasSubscription.nextDueDate)
    );

    return { status: "success", message: "Assinatura ativada com sucesso! O primeiro boleto/Pix será gerado em instantes." };
  } catch (err) {
    console.error("[ativar-assinatura] erro", err);
    return {
      status: "error",
      message: "Erro ao ativar a assinatura. Tente novamente ou entre em contato com o suporte."
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
