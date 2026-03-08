import type { ReactElement } from "react";
import { AuthCard } from "@/components/features/auth/auth-card";
import { LoginForm } from "@/components/features/auth/login-form";

export default function LoginPage(): ReactElement {
  return (
    <AuthCard title="Sign in to DepVault" subtitle="Enter your credentials to continue">
      <LoginForm />
    </AuthCard>
  );
}
