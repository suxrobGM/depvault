import type { ReactElement } from "react";
import { AuthCard, RegisterForm } from "@/components/features/auth";

export default function RegisterPage(): ReactElement {
  return (
    <AuthCard title="Create an account" subtitle="Get started with DepVault">
      <RegisterForm />
    </AuthCard>
  );
}
