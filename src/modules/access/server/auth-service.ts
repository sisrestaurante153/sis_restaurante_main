import { createServerSupabaseClient } from "@/lib/supabase";

export interface AuthUserRecord {
  id: string;
  restaurantId: string;
  email: string;
  nome: string;
  roleCodes: string[];
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createServerSupabaseClient();
  
  if (!supabase) {
    throw new Error("Erro de configuração: Chaves do Supabase não encontradas no ambiente.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (!data.user || !data.session) {
     return { ok: false as const, message: "Falha na autenticação." };
  }

  return {
    ok: true as const,
    user: {
      id: data.user.id,
      email: data.user.email!,
      nome: data.user.user_metadata.nome || data.user.email!,
      roleCodes: (data.user.app_metadata.roles as string[]) || [],
    },
    session: data.session
  };
}

export async function signUp(email: string, password: string, nome: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome }
    }
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, user: data.user };
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.APP_URL}/reset-password`,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}
