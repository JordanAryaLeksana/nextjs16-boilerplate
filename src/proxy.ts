import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/features/auth/session";

// Route Protection
// An optimistic check: it only looks for the session cookie. The backend still
// verifies the access token on every API call.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!hasSession && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Pages that need a session, plus the login page.
export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
