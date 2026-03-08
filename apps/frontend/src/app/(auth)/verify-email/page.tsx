import type { ReactElement } from "react";
import { Alert, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { verifyEmailAction } from "@/actions/auth";
import { AuthCard } from "@/components/features/auth";
import { ROUTES } from "@/lib/constants";

interface Props {
  searchParams: Promise<{ token: string | null }>;
}

export default async function VerifyEmailPage(props: Props): Promise<ReactElement> {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  if (!token) {
    return (
      <AuthCard title="Email Verification">
        <Stack spacing={2} alignItems="center">
          <Alert severity="error" sx={{ width: "100%" }}>
            Invalid verification link.
          </Alert>
          <Typography variant="body2">
            <Link href={ROUTES.login}>Back to sign in</Link>
          </Typography>
        </Stack>
      </AuthCard>
    );
  }

  const result = await verifyEmailAction(token);

  return (
    <AuthCard title="Email Verification">
      <Stack spacing={2} alignItems="center">
        <Alert severity={result.success ? "success" : "error"} sx={{ width: "100%" }}>
          {result.success ? "Your email has been verified successfully." : "Verification failed."}
        </Alert>
        <Typography variant="body2">
          <Link href={ROUTES.login}>{result.success ? "Go to sign in" : "Back to sign in"}</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
