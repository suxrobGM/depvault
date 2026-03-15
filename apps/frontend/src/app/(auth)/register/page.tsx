import type { ReactElement } from "react";
import type { Metadata } from "next";
import { AuthCard, RegisterForm } from "@/components/features/auth";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free DepVault account to analyze dependencies, detect vulnerabilities, and securely manage environment variables across your projects.",
};

interface RegisterPageProps {
  searchParams: Promise<{ inviteToken?: string }>;
}

export default async function RegisterPage(props: RegisterPageProps): Promise<ReactElement> {
  const { inviteToken } = await props.searchParams;

  return (
    <AuthCard title="Create an account" subtitle="Get started with DepVault">
      <RegisterForm inviteToken={inviteToken} />
    </AuthCard>
  );
}
