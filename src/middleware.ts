import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canAccessRoute, isProtectedPath } from "@/modules/access/domain/access-control";
import { readSignedSessionToken } from "@/modules/access/server/session";
import { SESSION_COOKIE_NAME } from "@/modules/access/server/session-cookie";
import { getRequiredSessionSecret } from "@/modules/platform/server/env";

const PUBLIC_FILE = /\.(.*)$/;

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

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await readSignedSessionToken(token, getRequiredSessionSecret());

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!canAccessRoute(pathname, session.roleCodes)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"]
};
