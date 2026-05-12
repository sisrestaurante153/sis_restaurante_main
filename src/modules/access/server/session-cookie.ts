import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequiredSessionSecret, getServerEnv } from "@/modules/platform/server/env";
import {
  createSignedSessionToken,
  readSignedSessionToken,
  type SessionPayload
} from "@/modules/access/server/session";

export const SESSION_COOKIE_NAME = "sis_session";
const SESSION_TTL_DAYS = 7;

export function buildSessionCookieOptions(expiresAt: Date) {
  const env = getServerEnv();

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  };
}

export async function createUserSession(input: {
  userId: string;
  restaurantId: string;
  email: string;
  name: string;
  roleCodes: string[];
}) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const payload: SessionPayload = {
    userId: input.userId,
    restaurantId: input.restaurantId,
    email: input.email,
    name: input.name,
    roleCodes: input.roleCodes,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    await createSignedSessionToken(payload, getRequiredSessionSecret()),
    buildSessionCookieOptions(expiresAt)
  );

  return payload;
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return readSignedSessionToken(token, getRequiredSessionSecret());
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
