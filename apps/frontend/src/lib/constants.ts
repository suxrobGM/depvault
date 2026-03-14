import type { Route } from "next";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  dashboard: "/dashboard",
  profileGeneral: "/profile/general",
  profileSecurity: "/profile/security",
  converter: "/converter",
  projects: "/projects",
  project: (id: string) => `/projects/${id}` as Route,
  projectOverview: (id: string) => `/projects/${id}/overview` as Route,
  projectMembers: (id: string) => `/projects/${id}/members` as Route,
  projectSettings: (id: string) => `/projects/${id}/settings` as Route,
  projectAnalysis: (id: string) => `/projects/${id}/analysis` as Route,
  projectAnalysisDetail: (id: string, analysisId: string) =>
    `/projects/${id}/analysis/${analysisId}` as Route,
  projectVault: (id: string) => `/projects/${id}/vault` as Route,
  projectVaultVariables: (id: string) => `/projects/${id}/vault/variables` as Route,
  projectVaultSecretFiles: (id: string) => `/projects/${id}/vault/secret-files` as Route,
  projectActivity: (id: string) => `/projects/${id}/activity` as Route,
  projectSecretScanning: (id: string) => `/projects/${id}/secret-scanning` as Route,
  projectLicenses: (id: string) => `/projects/${id}/licenses` as Route,
  activity: "/activity",
  security: "/security",
  settings: "/settings",
  secrets: "/secrets",
  notifications: "/notifications",
  docs: "/docs",
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
