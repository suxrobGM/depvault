import type { ReactElement } from "react";
import { Alert, Typography } from "@mui/material";
import Link from "next/link";
import { AuthCard, ResetPasswordForm } from "@/components/features/auth";
import { ROUTES } from "@/lib/constants";

interface Props {
  searchParams: Promise<{ token: string | null }>;
}

export default async function ResetPasswordPage(props: Props): Promise<ReactElement> {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

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
