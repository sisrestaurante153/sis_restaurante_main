"use server";

import { requirePermission } from "@/modules/access/server/authorization";
import { getUserManagementRepository } from "@/modules/access/server/user-management-repository";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function listUsersAction() {
  const actor = await requirePermission("billing.manage");
  return getUserManagementRepository().listUsers(actor.restaurantId);
}

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  roleCode: string;
}) {
  const actor = await requirePermission("billing.manage");

  if (!input.name.trim() || !input.email.trim() || !input.password || !input.roleCode) {
    return { ok: false as const, message: "Preencha todos os campos obrigatórios." };
  }
  if (input.password.length < 6) {
    return { ok: false as const, message: "A senha deve ter no mínimo 6 caracteres." };
  }

  const repo = getUserManagementRepository();

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.admin.createUser({
      email: input.email.toLowerCase().trim(),
      password: input.password,
      email_confirm: true,
      user_metadata: { nome: input.name.trim() }
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return { ok: false as const, message: "Este e-mail já está cadastrado no sistema de autenticação." };
      }
      return { ok: false as const, message: error.message };
    }

    await repo.createUser({
      name: input.name,
      email: input.email,
      restaurantId: actor.restaurantId,
      roleCode: input.roleCode
    });

    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, message: err instanceof Error ? err.message : "Erro ao criar usuário." };
  }
}

export async function updateUserAction(input: {
  id: string;
  name: string;
  roleCode: string;
  active: boolean;
}) {
  const actor = await requirePermission("billing.manage");

  if (!input.name.trim() || !input.roleCode) {
    return { ok: false as const, message: "Preencha todos os campos obrigatórios." };
  }
  if (actor.userId === input.id && !input.active) {
    return { ok: false as const, message: "Você não pode desativar sua própria conta." };
  }

  try {
    await getUserManagementRepository().updateUser(input);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, message: err instanceof Error ? err.message : "Erro ao atualizar usuário." };
  }
}

export async function deleteUserAction(userId: string) {
  const actor = await requirePermission("billing.manage");

  if (actor.userId === userId) {
    return { ok: false as const, message: "Você não pode excluir sua própria conta." };
  }

  try {
    await getUserManagementRepository().deleteUser(userId);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, message: err instanceof Error ? err.message : "Erro ao excluir usuário." };
  }
}
