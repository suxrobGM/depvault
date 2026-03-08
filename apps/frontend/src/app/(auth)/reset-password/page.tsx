"use client";

import type { ReactElement } from "react";
import { Alert, Typography } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/features/auth/auth-card";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { ROUTES } from "@/lib/constants";

export default function ResetPasswordPage(): ReactElement {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <AuthCard title="Invalid link">
        <Alert severity="error" sx={{ mb: 2 }}>
          This password reset link is invalid or has expired.
        </Alert>
        <Typography variant="body2" textAlign="center">
          <Link href={ROUTES.forgotPassword}>Request a new reset link</Link>
        </Typography>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your new password below">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
