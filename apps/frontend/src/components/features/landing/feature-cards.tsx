import type { ReactElement } from "react";
import {
  Lock as LockIcon,
  Security as SecurityIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { Box, Grid, Typography } from "@mui/material";
import { FeatureCard } from "@/components/ui/feature-card";
import { SectionContainer } from "@/components/ui/section-container";

const features = [
  {
    icon: <SecurityIcon />,
    title: "Dependency Analysis",
    description:
      "Upload any dependency file — package.json, requirements.txt, Cargo.toml, and more. Instantly detect outdated packages, known vulnerabilities, and license issues across your entire stack.",
    accentColor: "#10b981",
    delay: "vault-delay-1",
  },
  {
    icon: <LockIcon />,
    title: "Environment Vault",
    description:
      "Store environment variables with AES-256-GCM encryption. Compare environments side-by-side, detect missing variables, and keep your team in sync with onboarding checklists.",
    accentColor: "#f59e0b",
    delay: "vault-delay-2",
  },
  {
    icon: <ShareIcon />,
    title: "Secret Sharing",
    description:
      "Generate one-time encrypted links for sharing secrets. Set expiration times, add optional passwords, and ensure zero-knowledge delivery to your team.",
    accentColor: "#06b6d4",
    delay: "vault-delay-3",
  },
];

export function LandingFeatureCards(): ReactElement {
  return (
    <Box id="features" sx={{ position: "relative" }}>
      <SectionContainer>
        <Typography variant="h3" textAlign="center" className="vault-fade-up" sx={{ mb: 6 }}>
          Everything you need to ship securely
        </Typography>
        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid key={feature.title} size={{ xs: 12, md: 4 }}>
              <Box className={`vault-fade-up ${feature.delay}`}>
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  accentColor={feature.accentColor}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionContainer>
    </Box>
  );
}
