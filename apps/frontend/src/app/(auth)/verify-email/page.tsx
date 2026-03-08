"use client";

import { use, useState, type ReactElement } from "react";
import { Alert, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/features/auth/auth-card";
import { ROUTES } from "@/lib/constants";

async function verify(token: string | null) {
  if (!token) return { status: "error" as const, message: "Invalid verification link." };

  const { verifyEmailAction } = await import("@/actions/auth");
  const result = await verifyEmailAction(token);

  if (result.success) {
    return { status: "success" as const, message: "Your email has been verified successfully." };
  }
  return { status: "error" as const, message: result.error ?? "Verification failed." };
}

export default function VerifyEmailPage(): ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [promise] = useState(() => verify(token));
  const { status, message } = use(promise);

  return (
    <AuthCard title="Email Verification">
      <Stack spacing={2} alignItems="center">
        {status === "success" && (
          <>
            <Alert severity="success" sx={{ width: "100%" }}>
              {message}
            </Alert>
            <Typography variant="body2">
              <Link href={ROUTES.login}>Go to sign in</Link>
            </Typography>
          </>
        )}
        {status === "error" && (
          <>
            <Alert severity="error" sx={{ width: "100%" }}>
              {message}
            </Alert>
            <Typography variant="body2">
              <Link href={ROUTES.login}>Back to sign in</Link>
            </Typography>
          </>
        )}
      </Stack>
    </AuthCard>
  );
}
