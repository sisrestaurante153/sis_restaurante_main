"use server";

import { z } from "zod";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { signUp } from "@/modules/access/server/auth-service";
import { getBillingRepository } from "@/modules/billing/server/billing-repository";
import { createAsaasCustomer, createAsaasSubscription, planToAsaasDescription } from "@/modules/billing/server/asaas-client";
import type { PlanCode, PaymentMethod } from "@/modules/billing/domain/plans";
import { PLANS } from "@/modules/billing/domain/plans";

// ---------------------------------------------------------------------------
// Registro self-service
// ---------------------------------------------------------------------------

const registroSchema = z.object({
  nm_restaurante: z.string().min(2, "Informe o nome do restaurante."),
  nm_responsavel: z.string().min(2, "Informe o nome do responsável."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "Senha com no mínimo 8 caracteres."),
  plano: z.enum(["starter", "pro", "enterprise"])
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

  try {
    // 2. Cria restaurante + usuário local + assinatura em trial numa transação
    await prisma.$transaction(async (tx) => {
      const restaurante = await tx.restaurante.create({
        data: { nm_restaurante, sn_ativo: true }
      });

      await tx.user.create({
        data: {
          cd_usuario: authResult.user?.id ?? crypto.randomUUID(),
          nm_usuario: nm_responsavel,
          ds_email: email,
          sn_ativo: true,
          cd_restaurante: restaurante.cd_restaurante
        }
      });

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      await tx.assinatura.create({
        data: {
          cd_restaurante: restaurante.cd_restaurante,
          tp_plano: plano,
          tp_status: "trial",
          vl_mensal: PLANS[plano as PlanCode].monthlyValue,
          ts_trial_fim: trialEndsAt
        }
      });
    });
  } catch (err) {
    console.error("[registro] erro ao criar registros locais", err);
    return {
      status: "error",
      message: "Erro ao configurar a conta. Entre em contato com o suporte."
    };
  }

  return {
    status: "success",
    message: "Conta criada com sucesso! Verifique seu email para confirmar o cadastro e, em seguida, faça o login."
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
