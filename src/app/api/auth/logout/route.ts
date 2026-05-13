import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/modules/access/server/session-cookie";

const expired = new Date(0);
const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: expired
};

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Limpa sessão customizada
  response.cookies.set(SESSION_COOKIE_NAME, "", cookieBase);

  // Limpa token do Supabase (usado pelo middleware para verificar auth)
  response.cookies.set("sb-access-token", "", cookieBase);
  response.cookies.set("sb-refresh-token", "", cookieBase);

  return response;
}
