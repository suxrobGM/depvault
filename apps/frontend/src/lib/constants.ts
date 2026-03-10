export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  dashboard: "/dashboard",
  profile: "/profile",
  converter: "/converter",
  projects: "/projects",
  project: (id: string) => `/projects/${id}`,
  secrets: "/secrets",
} as const;

export const COOKIE_NAMES = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  timezone: "timezone",
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 25,
} as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
