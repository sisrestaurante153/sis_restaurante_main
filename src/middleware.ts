import { getSupabaseClient } from "@/lib/supabase";
import { canAccessRoute, isPublicPath } from "@/modules/access/domain/access-control";
import { readSignedSessionToken } from "@/modules/access/server/session";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

// Rotas que tenants com assinatura bloqueada ainda podem acessar
const SUBSCRIPTION_EXEMPT = ["/assinatura", "/login", "/registro", "/forbidden", "/api"];

function isSubscriptionExempt(pathname: string) {
  return SUBSCRIPTION_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSubscriptionBlocked(status: string, trialEndsAt: string | null): boolean {
  if (status === "cancelled" || status === "suspended") return true;
  if (status === "trial" && trialEndsAt) {
    return new Date(trialEndsAt) < new Date();
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.next();
  const token = request.cookies.get("sb-access-token")?.value ||
                request.headers.get("Authorization")?.split(" ")[1];

  const { data } = token
    ? await supabase.auth.getUser(token)
    : { data: { user: null } };

  const user = data?.user;

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("sis_session");
    return response;
  }

  // Verifica status da assinatura via sis_session
  if (!isSubscriptionExempt(pathname)) {
    const sessionToken = request.cookies.get("sis_session")?.value;
    const secret = process.env.SESSION_SECRET ?? "";

    if (sessionToken && secret) {
      const session = await readSignedSessionToken(sessionToken, secret);
      if (session && isSubscriptionBlocked(session.subscriptionStatus, session.trialEndsAt)) {
        return NextResponse.redirect(new URL("/assinatura?blocked=1", request.url));
      }
    }
  }

  const roleCodes = (user.app_metadata?.roles as string[]) || [];

  if (!canAccessRoute(pathname, roleCodes)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"]
};
