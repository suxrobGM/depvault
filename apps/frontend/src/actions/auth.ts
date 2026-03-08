"use server";

import { API_BASE_URL } from "@/lib/constants";

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  emailVerified: boolean;
}

interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

async function authFetch<T>(endpoint: string, body: unknown): Promise<ActionResult<T>> {
  const res = await fetch(`${API_BASE_URL}/api/auth${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.message || "Something went wrong" };
  }

  return { success: true, data };
}

export async function loginAction(
  email: string,
  password: string,
): Promise<ActionResult<AuthResponseData>> {
  return authFetch("/login", { email, password });
}

export async function registerAction(
  email: string,
  username: string,
  password: string,
): Promise<ActionResult<AuthResponseData>> {
  return authFetch("/register", { email, username, password });
}

export async function forgotPasswordAction(
  email: string,
): Promise<ActionResult<{ message: string }>> {
  return authFetch("/forgot-password", { email });
}

export async function resetPasswordAction(
  token: string,
  password: string,
): Promise<ActionResult<{ message: string }>> {
  return authFetch("/reset-password", { token, password });
}

export async function verifyEmailAction(token: string): Promise<ActionResult<{ message: string }>> {
  return authFetch("/verify-email", { token });
}
