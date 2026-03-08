import type { ReactElement } from "react";
import { Alert, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/features/auth";
import { getServerClient } from "@/lib/api-server";
import { ROUTES } from "@/lib/constants";

interface Props {
  searchParams: Promise<{ code: string | null }>;
}

export default async function GitHubCallbackPage(props: Props): Promise<ReactElement> {
  const searchParams = await props.searchParams;
  const code = searchParams.code;

  if (!code) {
    return (
      <AuthCard title="GitHub Sign In">
        <Stack spacing={2} alignItems="center">
          <Alert severity="error" sx={{ width: "100%" }}>
            Missing authorization code from GitHub.
          </Alert>
          <Typography variant="body2">
            <Link href={ROUTES.login}>Back to sign in</Link>
          </Typography>
        </Stack>
      </AuthCard>
    );
  }

  const client = await getServerClient();
  const { error } = await client.api.auth.github.callback.get({ query: { code } });

  if (!error) {
    redirect(ROUTES.dashboard);
  }

  return (
    <AuthCard title="GitHub Sign In">
      <Stack spacing={2} alignItems="center">
        <Alert severity="error" sx={{ width: "100%" }}>
          {error.value.message ?? "GitHub authentication failed."}
        </Alert>
        <Typography variant="body2">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
