import { getSupabaseClient } from "@/lib/supabase";
import { canAccessRoute, isPublicPath } from "@/modules/access/domain/access-control";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

  const roleCodes = (user.app_metadata?.roles as string[]) || [];

  if (!canAccessRoute(pathname, roleCodes)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"]
};
