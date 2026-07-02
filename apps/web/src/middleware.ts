import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE } from "@/lib/session-cookies";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/admin", "/onboarding"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*", "/onboarding/:path*"],
};
