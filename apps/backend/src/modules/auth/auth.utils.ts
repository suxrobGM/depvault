import type { Cookie } from "elysia";
import type { AuthResponse } from "./auth.schema";

const IS_PROD = process.env.NODE_ENV === "production";

const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

/**
 * Parses a duration string (e.g. "15m", "2h") into seconds.
 * If the input is invalid or missing, returns the provided fallback value.
 * @param expiry - Duration string to parse, consisting of a number followed by an optional unit (s, m, h, d, w).
 * @param fallback - Fallback value to return if the input is invalid or missing.
 * @returns The duration in seconds.
 */
function parseExpiry(expiry: string | undefined, fallback: number): number {
  if (!expiry) {
    return fallback;
  }

  const match = /^(\d+)([smhdw]?)$/.exec(expiry.trim());
  if (!match) {
    return fallback;
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2] || "s";
  return value * (UNIT_SECONDS[unit] ?? 1);
}

export function setAuthCookies(cookie: Record<string, Cookie<unknown>>, result: AuthResponse) {
  const accessMaxAge = parseExpiry(process.env.JWT_EXPIRY, 24 * 60 * 60);
  const refreshMaxAge = parseExpiry(process.env.REFRESH_TOKEN_EXPIRY, 7 * 24 * 60 * 60);

  cookie.access_token!.value = result.accessToken;
  cookie.access_token!.set({
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  cookie.refresh_token!.value = result.refreshToken;
  cookie.refresh_token!.set({
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/api/auth",
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(cookie: Record<string, Cookie<unknown>>) {
  cookie.access_token!.value = "";
  cookie.access_token!.set({
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/",
    maxAge: 0,
  });
  cookie.refresh_token!.value = "";
  cookie.refresh_token!.set({
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}
