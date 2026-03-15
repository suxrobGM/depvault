import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAMES, ROUTES } from "@/lib/constants";

const AUTH_ROUTES = [
  ROUTES.login,
  ROUTES.register,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.verifyEmail,
];

const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.secrets,
  ROUTES.pricing,
  ROUTES.terms,
  ROUTES.privacy,
  ROUTES.docs,
];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(COOKIE_NAMES.accessToken);

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (isAuthRoute && hasToken) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url));
  }

  if (!isAuthRoute && !isPublicRoute && !hasToken) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  return NextResponse.next();
}

/**
 * Apply middleware to all routes except static files and API routes.
 */
export const config = {
  matcher: [
    // Skip static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
