import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canAccessRoute, isProtectedPath } from "@/modules/access/domain/access-control";
import { getSupabaseClient } from "@/lib/supabase";

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

  const supabase = getSupabaseClient();
  const token = request.cookies.get("sb-access-token")?.value || 
                request.headers.get("Authorization")?.split(" ")[1];

  const { data: { user } } = token 
    ? await supabase.auth.getUser(token)
    : { data: { user: null } };

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
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
