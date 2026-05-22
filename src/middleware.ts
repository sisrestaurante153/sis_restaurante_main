import { canAccessRoute, isPublicPath } from "@/modules/access/domain/access-control";
import { readSignedSessionToken } from "@/modules/access/server/session";
import { isSubscriptionBlocked } from "@/modules/billing/domain/subscription-guard";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

const SUBSCRIPTION_EXEMPT = ["/assinatura", "/login", "/registro", "/forbidden", "/api"];

function isSubscriptionExempt(pathname: string) {
  return SUBSCRIPTION_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("sis_session");
  response.cookies.delete("sb-access-token");
  return response;
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

  const sessionToken = request.cookies.get("sis_session")?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = sessionToken && secret ? await readSignedSessionToken(sessionToken, secret) : null;

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Invalid/expired sis_session on /login — clear it so user can log in fresh
    if (sessionToken && !session) {
      const response = NextResponse.next();
      response.cookies.delete("sis_session");
      response.cookies.delete("sb-access-token");
      return response;
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected path — require valid session
  if (!session) {
    return redirectToLogin(request);
  }

  if (!isSubscriptionExempt(pathname)) {
    if (isSubscriptionBlocked(session.subscriptionStatus, session.trialEndsAt)) {
      return NextResponse.redirect(new URL("/assinatura?blocked=1", request.url));
    }
  }

  if (!canAccessRoute(pathname, session.roleCodes)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"]
};
