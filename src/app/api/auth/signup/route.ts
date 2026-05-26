import { NextResponse } from "next/server";
import { signUp, signInWithPassword } from "@/modules/access/server/auth-service";
import { getAuthRepository } from "@/modules/access/server/auth-repository";
import { createUserSession } from "@/modules/access/server/session-cookie";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const nome = typeof body?.nome === "string" ? body.nome : "";

  if (!email || !password || !nome) {
    return NextResponse.json(
      { message: "Revise os campos destacados." },
      { status: 400 }
    );
  }

  const result = await signUp(email, password, nome);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  // Log in immediately
  const loginResult = await signInWithPassword(email, password);
  if (!loginResult.ok) {
    return NextResponse.json({ message: loginResult.message }, { status: 401 });
  }

  const localUser = await getAuthRepository().findUserByEmail(loginResult.user.email);
  const restaurantId = localUser?.restaurantId ?? "rest_padrao";

  // Set the custom application session cookie
  await createUserSession({
    userId: loginResult.user.id,
    restaurantId,
    email: loginResult.user.email,
    name: loginResult.user.nome,
    roleCodes: loginResult.user.roleCodes,
    subscriptionStatus: localUser?.subscriptionStatus ?? "active",
    trialEndsAt: localUser?.trialEndsAt ?? null,
    nextBillingDate: localUser?.nextBillingDate ?? null
  });

  const response = NextResponse.json({ ok: true });

  // Set the Supabase access token cookie
  response.cookies.set("sb-access-token", loginResult.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: loginResult.session.expires_in,
    path: "/",
  });

  return response;
}
