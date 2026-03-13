import type { ReactElement } from "react";
import type { Metadata } from "next";
import { AuthCard, RegisterForm } from "@/components/features/auth";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free DepVault account to analyze dependencies, detect vulnerabilities, and securely manage environment variables across your projects.",
};

export default function RegisterPage(): ReactElement {
  return (
    <AuthCard title="Create an account" subtitle="Get started with DepVault">
      <RegisterForm />
    </AuthCard>
  );
}
