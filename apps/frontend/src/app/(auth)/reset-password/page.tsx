import type { ReactElement } from "react";
import type { Metadata } from "next";
import { AuthCard, AuthStatus, ResetPasswordForm } from "@/components/features/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your DepVault account.",
};

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
