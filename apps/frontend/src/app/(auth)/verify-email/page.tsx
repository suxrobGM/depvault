import type { ReactElement } from "react";
import type { Metadata } from "next";
import { verifyEmailAction } from "@/actions/auth";
import { AuthStatus } from "@/components/features/auth";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to complete your DepVault registration.",
};

interface Props {
  searchParams: Promise<{ token: string | null }>;
}

export default async function VerifyEmailPage(props: Props): Promise<ReactElement> {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  if (!token) {
    return (
      <AuthStatus
        title="Email Verification"
        message="Invalid verification link."
        linkHref={ROUTES.login}
        linkText="Back to sign in"
      />
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <AuthStatus
      title="Email Verification"
      severity={result.success ? "success" : "error"}
      message={
        result.success ? "Your email has been verified successfully." : "Verification failed."
      }
      linkHref={ROUTES.login}
      linkText={result.success ? "Go to sign in" : "Back to sign in"}
    />
  );
}
