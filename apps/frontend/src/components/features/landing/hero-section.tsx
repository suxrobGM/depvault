"use client";

import { type ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";
import { TypingEffect } from "@/components/ui/feedback";
import { ROUTES } from "@/lib/constants";
import { DemoVideo } from "./demo-video";

const ECOSYSTEM_FILES = [
  "package.json",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "*.csproj",
  ".env",
  "appsettings.json",
];

export function HeroSection(): ReactElement {
  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <Box className="vault-gradient-mesh" />
      <Box className="vault-dot-grid" />
      <SectionContainer sx={{ pt: { xs: 16, md: 20 }, pb: { xs: 4, md: 6 } }}>
        <Stack alignItems="center" textAlign="center" spacing={3}>
          <Box className="vault-fade-up" sx={{ mb: 1 }}>
            <Chip
              icon={<LockIcon sx={{ fontSize: 14 }} />}
              label="Zero-Knowledge Encryption · Open Source"
              size="small"
              variant="outlined"
              sx={{
                mb: 2,
                borderColor: "rgba(16, 185, 129, 0.3)",
                color: "primary.main",
                fontSize: "0.75rem",
                fontWeight: 500,
                "& .MuiChip-icon": { color: "primary.main" },
              }}
            />
          </Box>
          <Box className="vault-fade-up">
            <GradientText
              variant="h1"
              component="h1"
              animated
              sx={{ fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" } }}
            >
              Secure your stack.
            </GradientText>
            <Typography
              variant="h1"
              component="span"
              sx={{
                display: "block",
                mt: 0.5,
                fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" },
              }}
            >
              Analyze. Vault. Ship.
            </Typography>
          </Box>

          <Typography
            variant="h6"
            color="text.secondary"
            fontWeight={400}
            maxWidth={640}
            className="vault-fade-up vault-delay-1"
            sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}
          >
            Scan dependencies for vulnerabilities across{" "}
            <TypingEffect words={ECOSYSTEM_FILES} interval={2000} /> and 9+ ecosystems — store
            secrets with end-to-end encryption, and share .env files securely across your team.
          </Typography>

          <Box
            className="vault-fade-up vault-delay-2"
            sx={{
              mt: 3,
              px: 3,
              py: 1.5,
              borderRadius: 2,
              bgcolor: "rgba(0,0,0,0.4)",
              border: 1,
              borderColor: "vault.glassBorder",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: { xs: "0.85rem", md: "0.95rem" },
              color: "text.secondary",
              maxWidth: 480,
              textAlign: "left",
            }}
          >
            <Typography
              component="span"
              sx={{ color: "text.secondary", fontFamily: "inherit", fontSize: "inherit" }}
            >
              ${" "}
            </Typography>
            <Typography
              component="span"
              sx={{ color: "primary.main", fontFamily: "inherit", fontSize: "inherit" }}
            >
              depvault scan
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            className="vault-fade-up vault-delay-3"
            sx={{ mt: 3 }}
          >
            <Link href={ROUTES.register} style={{ textDecoration: "none" }}>
              <Button variant="contained" size="large" sx={{ px: 4 }}>
                Get Started
              </Button>
            </Link>
            <Button
              variant="outlined"
              size="large"
              sx={{ px: 4 }}
              href="/docs/cli#quick-install"
              component="a"
            >
              Install CLI
            </Button>
          </Stack>
        </Stack>
      </SectionContainer>

      {/* Demo video */}
      <SectionContainer>
        <DemoVideo />
      </SectionContainer>
    </Box>
  );
}
