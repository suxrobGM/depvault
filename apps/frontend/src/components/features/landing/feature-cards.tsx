import type { ReactElement, ReactNode } from "react";
import {
  FolderZip as BundlerIcon,
  Rocket as CiCdIcon,
  Terminal as CliIcon,
  SwapHoriz as ConverterIcon,
  GitHub as GitIcon,
  Description as LicenseIcon,
  ContentCopy as TemplateIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";
import { FeatureAnalysis } from "./feature-analysis";
import { FeatureSharing } from "./feature-sharing";
import { FeatureVault } from "./feature-vault";

interface MoreFeature {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

const moreFeatures: MoreFeature[] = [
  {
    icon: <CliIcon />,
    title: "CLI-First Workflow",
    description:
      "Native AOT binary — no runtime needed. Scan, push, and pull from your terminal. Browser-based login, interactive prompts, and CI/CD token mode.",
    color: "var(--mui-palette-primary-main)",
  },
  {
    icon: <GitIcon />,
    title: "Git Secret Detection",
    description:
      "Scan connected repos for accidentally committed secrets with built-in and custom regex patterns.",
    color: "var(--mui-palette-error-main)",
  },
  {
    icon: <CiCdIcon />,
    title: "CI/CD Secret Injection",
    description:
      "Generate scoped, short-lived tokens for pipelines to pull end-to-end encrypted secrets at build time — no .env files in CI.",
    color: "var(--mui-palette-info-light)",
  },
  {
    icon: <ConverterIcon />,
    title: "Format Converter",
    description:
      "Convert between .env, appsettings.json, YAML, TOML, and more with preview before download.",
    color: "#a78bfa",
  },
  {
    icon: <TemplateIcon />,
    title: "Environment Templates",
    description:
      "Clone an environment's variable structure to bootstrap new stages. Diff templates against live environments.",
    color: "#fb923c",
  },
  {
    icon: <LicenseIcon />,
    title: "License Compliance",
    description:
      "Detect license types per dependency, configure allow/warn/block policies, and export audit reports.",
    color: "#38bdf8",
  },
  {
    icon: <BundlerIcon />,
    title: "Secret File Bundler",
    description:
      "Download all required env variables and secret files for an environment as a single encrypted archive with a one-time password.",
    color: "#e879f9",
  },
];

export function LandingFeatureCards(): ReactElement {
  return (
    <Box component="section" id="features" sx={{ position: "relative" }}>
      <SectionContainer sx={{ pt: { xs: 10, md: 16 } }}>
        <Typography variant="h2" textAlign="center" className="vault-fade-up" sx={{ mb: 1 }}>
          Everything you need to ship securely
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          className="vault-fade-up vault-delay-1"
          sx={{ mb: 8, maxWidth: 520, mx: "auto" }}
        >
          Dependency analysis, encrypted vaults, secret sharing, and more — one unified platform
        </Typography>
        <Stack spacing={8}>
          <Box className="vault-fade-up vault-delay-2">
            <FeatureAnalysis />
          </Box>
          <Box className="vault-fade-up vault-delay-3">
            <FeatureVault />
          </Box>
          <Box className="vault-fade-up vault-delay-4">
            <FeatureSharing />
          </Box>
        </Stack>

        <Typography variant="h3" textAlign="center" sx={{ mt: { xs: 10, md: 14 }, mb: 1 }}>
          And that&apos;s not all
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 6, maxWidth: 480, mx: "auto" }}
        >
          Built-in tools for every stage of your security workflow
        </Typography>
        <Grid container spacing={3}>
          {moreFeatures.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <GlassCard glowColor={feature.color} sx={{ height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <IconBox color={feature.color} sx={{ mb: 2 }}>
                    {feature.icon}
                  </IconBox>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </SectionContainer>
    </Box>
  );
}
