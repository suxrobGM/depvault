import type { ReactElement } from "react";
import { Alert, Stack, Typography, type AlertColor } from "@mui/material";
import Link from "next/link";
import { AuthCard } from "./auth-card";

interface AuthStatusProps {
  title: string;
  message: string;
  linkHref: string;
  linkText: string;
  severity?: AlertColor;
}

export function AuthStatus(props: AuthStatusProps): ReactElement {
  const { title, message, linkHref, linkText, severity = "error" } = props;

  return (
    <AuthCard title={title}>
      <Stack spacing={2} alignItems="center">
        <Alert severity={severity} sx={{ width: "100%" }}>
          {message}
        </Alert>
        <Typography variant="body2">
          <Link href={linkHref}>{linkText}</Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
