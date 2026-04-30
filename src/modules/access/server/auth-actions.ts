"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithPassword } from "@/modules/access/server/auth-service";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Informe um email valido."),
  password: z.string().min(8, "Senha com no minimo 8 caracteres.")
});

export interface AuthFormState {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email")?.toString(),
    password: formData.get("password")?.toString()
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos destacados.",
      errors: parsed.error.flatten().fieldErrors
    };
  }

  const result = await signInWithPassword(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("sb-access-token", result.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: result.session.expires_in,
    path: "/",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  
  if (token) {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      redirect("/dashboard");
    }
  }
}
