import type { Cookie } from "elysia";
import type { AuthResponse } from "./auth.schema";

const IS_PROD = process.env.NODE_ENV === "production";
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function setAuthCookies(cookie: Record<string, Cookie<unknown>>, result: AuthResponse) {
  cookie.access_token!.value = result.accessToken;
  cookie.access_token!.set({
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookie.refresh_token!.value = result.refreshToken;
  cookie.refresh_token!.set({
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE,
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
