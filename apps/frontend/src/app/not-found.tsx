import type { ReactElement } from "react";
import { Shield as ShieldIcon } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/cards";
import { ROUTES } from "@/lib/constants";

export default function NotFound(): ReactElement {
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
            bgcolor: "vault.glowPrimary",
            mb: 3,
          }}
        >
          <ShieldIcon sx={{ color: "primary.main", fontSize: 32 }} />
        </Box>
        <GradientText
          variant="h1"
          component="h1"
          gradient="linear-gradient(135deg, #10b981, #34d399, #06b6d4)"
        >
          404
        </GradientText>
        <Typography
          variant="h6"
          sx={{
            color: "text.secondary",
            mt: 2,
            mb: 4,
          }}
        >
          This page doesn&apos;t exist or has been moved.
        </Typography>
        <Link href={ROUTES.home} style={{ textDecoration: "none" }}>
          <Button variant="contained" size="large">
            Go Home
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
