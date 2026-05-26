"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithPassword } from "@/modules/access/server/auth-service";
import { getAuthRepository } from "@/modules/access/server/auth-repository";
import { cookies } from "next/headers";
import { createUserSession, getCurrentSession, SESSION_COOKIE_NAME } from "@/modules/access/server/session-cookie";

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

  const localUser = await getAuthRepository().findUserByEmail(result.user.email);
  const restaurantId = localUser?.restaurantId ?? "rest_padrao";

  await createUserSession({
    userId: localUser?.id ?? result.user.id,
    restaurantId,
    email: result.user.email,
    name: result.user.nome,
    roleCodes: result.user.roleCodes,
    subscriptionStatus: localUser?.subscriptionStatus,
    trialEndsAt: localUser?.trialEndsAt,
    nextBillingDate: localUser?.nextBillingDate
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("sb-access-token");
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }
}
