import { NextResponse } from "next/server";
import { authenticateByPassword } from "@/modules/access/server/auth-service";
import { getAuthRepository } from "@/modules/access/server/auth-repository";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions
} from "@/modules/access/server/session-cookie";
import { createSignedSessionToken } from "@/modules/access/server/session";
import { getRequiredSessionSecret } from "@/modules/platform/server/env";

const SESSION_TTL_DAYS = 7;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      {
        message: "Revise os campos destacados."
      },
      { status: 400 }
    );
  }

  const repository = getAuthRepository();
  const result = await authenticateByPassword({
    email,
    password,
    findUserByEmail: repository.findUserByEmail
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 401 });
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const token = await createSignedSessionToken(
    {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.nome,
      roleCodes: result.user.roleCodes,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    },
    getRequiredSessionSecret()
  );

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions(expiresAt));

  return response;
}
