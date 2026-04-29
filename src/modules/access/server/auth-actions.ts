"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticateByPassword } from "@/modules/access/server/auth-service";
import { getAuthRepository } from "@/modules/access/server/auth-repository";
import { clearUserSession, createUserSession, getCurrentSession } from "@/modules/access/server/session-cookie";

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

  const repository = getAuthRepository();
  const result = await authenticateByPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    findUserByEmail: repository.findUserByEmail
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.message
    };
  }

  await createUserSession({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.nome,
    roleCodes: result.user.roleCodes
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearUserSession();
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }
}
