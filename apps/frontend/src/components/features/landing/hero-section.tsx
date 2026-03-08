"use client";

import { useCallback, type ReactElement } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { SectionContainer } from "@/components/ui/section-container";
import { TypingEffect } from "@/components/ui/typing-effect";
import { ROUTES } from "@/lib/constants";

const ECOSYSTEM_FILES = [
  "package.json",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "*.csproj",
  ".env",
  "appsettings.json",
];

const TERMINAL_LINES = [
  { prefix: "$", text: "depvault scan ./project", color: "text.primary" },
  { prefix: "→", text: "Detected package.json (Node.js)", color: "text.secondary" },
  { prefix: "→", text: "Analyzing 142 dependencies...", color: "text.secondary" },
  { prefix: "✓", text: "3 critical vulnerabilities found", color: "error.main" },
  { prefix: "✓", text: "12 outdated packages flagged", color: "warning.main" },
  { prefix: "✓", text: "Vault synced — 8 secrets encrypted", color: "primary.main" },
];

export function HeroSection(): ReactElement {
  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <Box className="vault-gradient-mesh" />
      <Box className="vault-dot-grid" />
      <SectionContainer sx={{ pt: { xs: 16, md: 20 }, pb: { xs: 4, md: 6 } }}>
        <Stack alignItems="center" textAlign="center" spacing={3}>
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
            maxWidth={600}
            className="vault-fade-up vault-delay-1"
            sx={{ fontSize: { xs: "1rem", md: "1.25rem" } }}
          >
            Scan <TypingEffect words={ECOSYSTEM_FILES} interval={2000} /> and 8+ ecosystems — detect
            vulnerabilities, vault secrets, and ship with confidence.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            className="vault-fade-up vault-delay-2"
            sx={{ mt: 2 }}
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
              onClick={() => scrollTo("features")}
            >
              Learn More
            </Button>
          </Stack>
        </Stack>
      </SectionContainer>

      {/* Mock terminal */}
      <SectionContainer sx={{ pb: { xs: 8, md: 12 }, mt: -2 }}>
        <Box
          className="vault-fade-up vault-delay-3"
          sx={{
            maxWidth: 640,
            mx: "auto",
            borderRadius: 2,
            overflow: "hidden",
            border: 1,
            borderColor: "vault.glassBorder",
            bgcolor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Title bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 2,
              py: 1.25,
              borderBottom: 1,
              borderColor: "vault.glassBorder",
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444" }} />
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f59e0b" }} />
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#10b981" }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1.5, fontFamily: "var(--font-jetbrains), monospace", fontSize: "0.7rem" }}
            >
              terminal
            </Typography>
          </Box>

          {/* Terminal content */}
          <Box sx={{ p: 2 }}>
            <Stack spacing={0.75}>
              {TERMINAL_LINES.map((line) => (
                <Typography
                  key={line.text}
                  variant="body2"
                  sx={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: { xs: "0.7rem", sm: "0.8rem" },
                    color: line.color,
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Box component="span" sx={{ color: "text.secondary", flexShrink: 0 }}>
                    {line.prefix}
                  </Box>
                  {line.text}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Box>
      </SectionContainer>
    </Box>
  );
}
