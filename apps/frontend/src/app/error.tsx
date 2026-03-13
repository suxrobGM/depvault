"use client";

import type { ReactElement } from "react";
import { Warning as WarningIcon } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/cards";
import { ROUTES } from "@/lib/constants";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage(props: ErrorPageProps): ReactElement {
  const { error, reset } = props;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        position: "relative",
        bgcolor: "background.default",
      }}
    >
      <Box className="vault-dot-grid" />
      <Box className="vault-fade-up" sx={{ position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "vault.glowSecondary",
            mb: 3,
          }}
        >
          <WarningIcon sx={{ color: "secondary.main", fontSize: 32 }} />
        </Box>
        <GradientText
          variant="h3"
          component="h1"
          gradient="linear-gradient(135deg, var(--mui-palette-secondary-main), var(--mui-palette-secondary-light), var(--mui-palette-secondary-dark))"
        >
          Something went wrong
        </GradientText>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 2,
            mb: 4,
            fontFamily: "var(--font-jetbrains), monospace",
            maxWidth: 480,
            mx: "auto",
          }}
        >
          {error.message || "An unexpected error occurred."}
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="contained" size="large" onClick={reset}>
            Try Again
          </Button>
          <Button component={Link} href={ROUTES.home} variant="outlined" size="large">
            Go Home
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
