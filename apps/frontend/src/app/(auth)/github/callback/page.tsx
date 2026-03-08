"use client";

import { use, useState, type ReactElement } from "react";
import { Alert, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { redirect, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/features/auth/auth-card";
import { API_BASE_URL, ROUTES } from "@/lib/constants";

async function authenticate(code: string | null): Promise<{ error: string | null }> {
  if (!code) return { error: "Missing authorization code from GitHub." };

  const res = await fetch(
    `${API_BASE_URL}/api/auth/github/callback?code=${encodeURIComponent(code)}`,
    { credentials: "include" },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.message || "GitHub authentication failed" };
  }

  return { error: null };
}

export default function GitHubCallbackPage(): ReactElement {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [promise] = useState(() => authenticate(code));
  const { error } = use(promise);

  if (!error) {
    redirect(ROUTES.dashboard);
  }

  return (
    <AuthCard title="GitHub Sign In">
      <Stack spacing={2} alignItems="center">
        <Alert severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
        <Typography variant="body2">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
