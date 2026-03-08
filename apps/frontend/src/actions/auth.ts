"use server";

import { getServerClient } from "@/lib/api-server";
import type { ActionResult } from "@/types/action";

export async function forgotPasswordAction(email: string): Promise<ActionResult> {
  const client = await getServerClient();
  const { data, error } = await client.api.auth["forgot-password"].post({ email });
  if (error) {
    return {
      success: false,
      error: error.value.message ?? "Failed to request password reset",
    };
  }
  return { success: true, data };
}

export async function resetPasswordAction(token: string, password: string): Promise<ActionResult> {
  const client = await getServerClient();
  const { data, error } = await client.api.auth["reset-password"].post({ token, password });
  if (error) {
    return { success: false, error: error.value.message ?? "Failed to reset password" };
  }
  return { success: true, data };
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  const client = await getServerClient();
  const { data, error } = await client.api.auth["verify-email"].post({ token });
  if (error) {
    return { success: false, error: error.value.message ?? "Failed to verify email" };
  }
  return { success: true, data };
}
