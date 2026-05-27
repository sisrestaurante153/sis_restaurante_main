"use server";

import { requirePermission } from "@/modules/access/server/authorization";
import { getUserManagementRepository } from "@/modules/access/server/user-management-repository";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function listUsersAction() {
  const actor = await requirePermission("billing.manage");
  return getUserManagementRepository().listUsers(actor.restaurantId);
}

export async function listRestaurantsAction() {
  await requirePermission("billing.manage");
  const repo = getUserManagementRepository();
  const list = await repo.listAllRestaurants();
  return list.map(r => ({
    id: r.cd_restaurante,
    name: r.nm_restaurante
  }));
}

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  roleCode: string;
  restaurantId?: string | null;
}) {
  const actor = await requirePermission("billing.manage");
  const isSuperAdmin = actor.roleCodes.includes("super-admin");
  const targetRestaurantId = isSuperAdmin ? input.restaurantId : actor.restaurantId;

  if (input.roleCode === "super-admin" && !isSuperAdmin) {
    return { ok: false as const, message: "Não é permitido atribuir perfil super-admin." };
  }

  if (!input.name.trim() || !input.email.trim() || !input.password || !input.roleCode) {
    return { ok: false as const, message: "Preencha todos os campos obrigatórios." };
  }
  if (input.password.length < 6) {
    return { ok: false as const, message: "A senha deve ter no mínimo 6 caracteres." };
  }

  const repo = getUserManagementRepository();

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email.toLowerCase().trim(),
      password: input.password,
      email_confirm: true,
      user_metadata: { nome: input.name.trim() },
      app_metadata: { roles: [input.roleCode] }
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

    try {
      await repo.createUser({
        id: data.user.id,
        name: input.name,
        email: input.email,
        restaurantId: targetRestaurantId || null,
        roleCode: input.roleCode
      });
    } catch (prismaErr) {
      // Clean up Supabase Auth user to avoid orphans
      await supabase.auth.admin.deleteUser(data.user.id);
      throw prismaErr;
    }

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
  restaurantId?: string | null;
}) {
  const actor = await requirePermission("billing.manage");
  const isSuperAdmin = actor.roleCodes.includes("super-admin");
  const targetRestaurantId = isSuperAdmin ? input.restaurantId : actor.restaurantId;

  if (input.roleCode === "super-admin" && !isSuperAdmin) {
    return { ok: false as const, message: "Não é permitido atribuir perfil super-admin." };
  }

  if (!input.name.trim() || !input.roleCode) {
    return { ok: false as const, message: "Preencha todos os campos obrigatórios." };
  }
  if (actor.userId === input.id && !input.active) {
    return { ok: false as const, message: "Você não pode desativar sua própria conta." };
  }

  const repo = getUserManagementRepository();
  const email = await repo.findUserEmailById(input.id);
  if (!email) {
    return { ok: false as const, message: "Usuário não encontrado." };
  }

  try {
    // 1. Sync with Supabase
    try {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase.auth.admin.listUsers();
      const su = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (su) {
        await supabase.auth.admin.updateUserById(su.id, {
          user_metadata: { nome: input.name.trim() },
          app_metadata: { roles: [input.roleCode] }
        });
      }
    } catch (supabaseErr) {
      console.error("[updateUserAction] Supabase sync failed:", supabaseErr);
    }

    // 2. Update locally
    await repo.updateUser({
      ...input,
      restaurantId: targetRestaurantId
    });
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

  const repo = getUserManagementRepository();
  const email = await repo.findUserEmailById(userId);
  if (!email) {
    return { ok: false as const, message: "Usuário não encontrado." };
  }

  try {
    await repo.deleteUser(userId);

    // Revoke Supabase Auth account so any active sb-access-token becomes invalid immediately
    try {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase.auth.admin.listUsers();
      const supabaseUser = data.users.find((u) => u.email === email);
      if (supabaseUser) {
        await supabase.auth.admin.deleteUser(supabaseUser.id);
      }
    } catch (supabaseErr) {
      // Non-fatal: local record is already deleted; log and continue
      console.error("[deleteUserAction] Supabase Auth revocation failed:", supabaseErr);
    }

    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, message: err instanceof Error ? err.message : "Erro ao excluir usuário." };
  }
}
