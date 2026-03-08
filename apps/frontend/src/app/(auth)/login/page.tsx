import type { ReactElement } from "react";
import { AuthCard, LoginForm } from "@/components/features/auth";

export default function LoginPage(): ReactElement {
  return (
    <AuthCard title="Sign in to DepVault" subtitle="Enter your credentials to continue">
      <LoginForm />
    </AuthCard>
  );
}
