import { NextResponse } from "next/server";
import { createUserSession } from "@/modules/access/server/session-cookie";
import { getPrismaClient } from "@/modules/platform/infra/prisma";
import { getServerEnv } from "@/modules/platform/server/env";

export async function GET() {
  const env = getServerEnv();
  const prisma = getPrismaClient(env.DATABASE_URL);
  if (!prisma) {
    return NextResponse.json({ error: "Prisma not available" }, { status: 500 });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "No user found" }, { status: 404 });
  }

  await createUserSession({
    userId: user.cd_usuario,
    restaurantId: user.cd_restaurante || "rest_padrao",
    email: user.ds_email,
    name: user.nm_usuario,
    roleCodes: ["admin"],
    subscriptionStatus: "active"
  });

  return NextResponse.redirect(new URL("/fichas", env.APP_URL || "http://localhost:3000"));
}
