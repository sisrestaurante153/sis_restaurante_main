"use server";

import { z } from "zod";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";
import { requirePermission } from "@/modules/access/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase";
import { PLANS } from "@/modules/billing/domain/plans";

const createRestaurantSchema = z.object({
  name: z.string().min(2, "O nome do restaurante deve ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  planCode: z.enum(["starter", "pro", "enterprise"])
});

const updateRestaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "O nome do restaurante deve ter pelo menos 2 caracteres."),
  planCode: z.enum(["starter", "pro", "enterprise"]),
  status: z.enum(["trial", "active", "overdue", "cancelled", "suspended", "bloqueada", "expirada"])
});

export async function listRestaurantsAction() {
  await requirePermission("billing.manage");
  
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    throw new Error("Não foi possível conectar ao banco de dados.");
  }

  const restaurants = await prisma.restaurante.findMany({
    orderBy: { ts_criacao: "desc" },
    include: {
      assinatura: true,
      _count: {
        select: { usuarios: true }
      }
    }
  });

  return restaurants.map(r => ({
    id: r.cd_restaurante,
    name: r.nm_restaurante,
    plan: r.assinatura?.tp_plano ?? "Sem plano",
    status: r.assinatura?.tp_status ?? "trial",
    userCount: r._count.usuarios,
    createdAt: r.ts_criacao.toISOString(),
    nextBillingDate: r.assinatura?.ts_proximo_vencimento?.toISOString() ?? null,
    trialEndsAt: r.assinatura?.ts_trial_fim?.toISOString() ?? null
  }));
}

export async function createRestaurantAction(input: z.infer<typeof createRestaurantSchema>) {
  await requirePermission("billing.manage");

  const parsed = createRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password, planCode } = parsed.data;
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    return { ok: false as const, message: "Não foi possível conectar ao banco de dados." };
  }

  // 1. Verifique se o e-mail de admin já existe no local
  const existingUser = await prisma.user.findUnique({
    where: { ds_email: email.toLowerCase().trim() }
  });
  if (existingUser) {
    return { ok: false as const, message: "Este e-mail de administrador já está cadastrado no sistema." };
  }

  // 2. Criar no Supabase Auth
  let authUserId = "";
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: { nome: "Admin " + name.trim() },
      app_metadata: { roles: ["admin"] }
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return { ok: false as const, message: "Este e-mail já está cadastrado no sistema de autenticação." };
      }
      return { ok: false as const, message: error.message };
    }

    if (!data.user) {
      return { ok: false as const, message: "Erro ao criar usuário no provedor de autenticação." };
    }
    authUserId = data.user.id;
  } catch (err) {
    return { ok: false as const, message: err instanceof Error ? err.message : "Erro ao criar usuário no Supabase." };
  }

  // 3. Criar restaurante, assinatura e usuário local em transação Prisma
  try {
    const planConfig = PLANS[planCode] || PLANS.starter;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    await prisma.$transaction(async (tx) => {
      const restaurante = await tx.restaurante.create({
        data: {
          nm_restaurante: name.trim(),
          sn_ativo: true
        }
      });

      await tx.user.create({
        data: {
          cd_usuario: authUserId,
          nm_usuario: "Administrador",
          ds_email: email.toLowerCase().trim(),
          sn_ativo: true,
          cd_restaurante: restaurante.cd_restaurante
        }
      });

      const roleRecord = await tx.role.findFirst({ where: { ds_codigo: "admin" } });
      if (roleRecord) {
        await tx.userRole.create({
          data: {
            cd_usuario: authUserId,
            cd_role: roleRecord.cd_role
          }
        });
      }

      await tx.assinatura.create({
        data: {
          cd_restaurante: restaurante.cd_restaurante,
          tp_plano: planCode,
          tp_status: "trial",
          vl_mensal: planConfig.monthlyValue,
          ts_trial_fim: trialEndsAt
        }
      });
    });

    return { ok: true as const };
  } catch (err) {
    // Tenta limpar o usuário criado no Supabase se der erro no banco
    try {
      const supabase = createServerSupabaseClient();
      await supabase.auth.admin.deleteUser(authUserId);
    } catch (cleanErr) {
      console.error("Erro ao limpar usuário Supabase órfão:", cleanErr);
    }

    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Erro ao criar restaurante no banco de dados."
    };
  }
}

export async function updateRestaurantAction(input: z.infer<typeof updateRestaurantSchema>) {
  await requirePermission("billing.manage");

  const parsed = updateRestaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { id, name, planCode, status } = parsed.data;
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    return { ok: false as const, message: "Não foi possível conectar ao banco de dados." };
  }

  try {
    const planConfig = PLANS[planCode] || PLANS.starter;

    await prisma.$transaction(async (tx) => {
      await tx.restaurante.update({
        where: { cd_restaurante: id },
        data: { nm_restaurante: name.trim(), ts_atualizacao: new Date() }
      });

      await tx.assinatura.upsert({
        where: { cd_restaurante: id },
        create: {
          cd_restaurante: id,
          tp_plano: planCode,
          tp_status: status,
          vl_mensal: planConfig.monthlyValue
        },
        update: {
          tp_plano: planCode,
          tp_status: status,
          vl_mensal: planConfig.monthlyValue,
          ts_atualizacao: new Date()
        }
      });
    });

    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Erro ao atualizar restaurante."
    };
  }
}

export async function deleteRestaurantAction(restaurantId: string) {
  await requirePermission("billing.manage");

  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    return { ok: false as const, message: "Não foi possível conectar ao banco de dados." };
  }

  try {
    // 1. Verificar se há usuários ativos vinculados
    const activeUsers = await prisma.user.count({
      where: {
        cd_restaurante: restaurantId,
        sn_ativo: true
      }
    });

    if (activeUsers > 0) {
      return {
        ok: false as const,
        message: `Não é possível excluir o restaurante pois existem ${activeUsers} usuário(s) ativo(s) vinculado(s).`
      };
    }

    // 2. Buscar usuários vinculados (mesmo inativos) para revogar no Supabase e excluir localmente
    const linkedUsers = await prisma.user.findMany({
      where: { cd_restaurante: restaurantId },
      select: { cd_usuario: true, ds_email: true }
    });

    const userIds = linkedUsers.map(u => u.cd_usuario);
    const userEmails = linkedUsers.map(u => u.ds_email);

    // 3. Excluir dados vinculados na transação
    await prisma.$transaction(async (tx) => {
      // Excluir papeis dos usuários a serem removidos
      if (userIds.length > 0) {
        await tx.userRole.deleteMany({
          where: { cd_usuario: { in: userIds } }
        });
      }

      // Excluir os usuários
      if (userIds.length > 0) {
        await tx.user.deleteMany({
          where: { cd_usuario: { in: userIds } }
        });
      }

      // A exclusão do restaurante fará cascata para assinatura (onDelete: Cascade)
      // Mas para itens e fichas, cd_restaurante não tem Cascade. Vamos deletá-los
      await tx.item.deleteMany({ where: { cd_restaurante: restaurantId } });
      await tx.fichaTecnica.deleteMany({ where: { cd_restaurante: restaurantId } });
      await tx.importacaoExecucao.deleteMany({ where: { cd_restaurante: restaurantId } });

      // Finalmente deleta o restaurante
      await tx.restaurante.delete({
        where: { cd_restaurante: restaurantId }
      });
    });

    // 4. Revogar contas no Supabase Auth após transação bem sucedida
    try {
      const supabase = createServerSupabaseClient();
      for (const email of userEmails) {
        const { data } = await supabase.auth.admin.listUsers();
        const su = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (su) {
          await supabase.auth.admin.deleteUser(su.id);
        }
      }
    } catch (supabaseErr) {
      console.error("[deleteRestaurantAction] Supabase Auth cleanup failed:", supabaseErr);
    }

    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Erro ao excluir restaurante."
    };
  }
}
