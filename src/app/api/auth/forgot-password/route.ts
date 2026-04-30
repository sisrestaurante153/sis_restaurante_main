import { NextResponse } from "next/server";
import { resetPasswordForEmail } from "@/modules/access/server/auth-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";

  if (!email) {
    return NextResponse.json(
      { message: "Informe o email." },
      { status: 400 }
    );
  }

  const result = await resetPasswordForEmail(email);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
