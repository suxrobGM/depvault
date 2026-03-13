import type { ReactElement } from "react";
import type { Metadata } from "next";
import { AuthCard, ForgotPasswordForm } from "@/components/features/auth";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your DepVault password. Enter your email to receive a password reset link.",
};

export default function ForgotPasswordPage(): ReactElement {
  return (
    <AuthCard title="Forgot password?" subtitle="Enter your email and we'll send you a reset link">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
