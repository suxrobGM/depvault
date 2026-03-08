import type { ReactElement } from "react";
import { AuthCard } from "@/components/features/auth/auth-card";
import { RegisterForm } from "@/components/features/auth/register-form";

export default function RegisterPage(): ReactElement {
  return (
    <AuthCard title="Create an account" subtitle="Get started with DepVault">
      <RegisterForm />
    </AuthCard>
  );
}
