import type { ReactElement } from "react";
import { AuthCard, AuthStatus, ResetPasswordForm } from "@/components/features/auth";
import { ROUTES } from "@/lib/constants";

interface Props {
  searchParams: Promise<{ token: string | null }>;
}

export default async function ResetPasswordPage(props: Props): Promise<ReactElement> {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  if (!token) {
    return (
      <AuthStatus
        title="Invalid link"
        message="This password reset link is invalid or has expired."
        linkHref={ROUTES.forgotPassword}
        linkText="Request a new reset link"
      />
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your new password below">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
