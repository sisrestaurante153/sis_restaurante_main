import { NextResponse } from "next/server";
import { signInWithPassword } from "@/modules/access/server/auth-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { message: "Revise os campos destacados." },
      { status: 400 }
    );
  }

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  
  // Set the Supabase access token cookie
  response.cookies.set("sb-access-token", result.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: result.session.expires_in,
    path: "/",
  });

  return response;
}
