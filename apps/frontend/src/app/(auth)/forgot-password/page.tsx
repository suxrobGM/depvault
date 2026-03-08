import type { ReactElement } from "react";
import { AuthCard } from "@/components/features/auth/auth-card";
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";

export default function ForgotPasswordPage(): ReactElement {
  return (
    <AuthCard title="Forgot password?" subtitle="Enter your email and we'll send you a reset link">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
