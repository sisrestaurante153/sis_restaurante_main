import { NextResponse } from "next/server";
import { signUp } from "@/modules/access/server/auth-service";

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

  return NextResponse.json({ ok: true });
}
