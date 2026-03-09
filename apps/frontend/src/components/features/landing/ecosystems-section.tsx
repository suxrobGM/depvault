import type { ReactElement, ReactNode } from "react";
import {
  Code as CodeIcon,
  InsertDriveFile as FileIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionContainer } from "@/components/ui/section-container";

interface EcosystemCategory {
  title: string;
  icon: ReactNode;
  color: string;
  items: string[];
  mono?: boolean;
}

const categories: EcosystemCategory[] = [
  {
    title: "Dependency Ecosystems",
    icon: <CodeIcon sx={{ fontSize: 20 }} />,
    color: "#10b981",
    items: ["Node.js", "Python", "Rust", ".NET", "Go", "Java / Kotlin", "Ruby", "PHP"],
  },
  {
    title: "Config Formats",
    icon: <FileIcon sx={{ fontSize: 20 }} />,
    color: "#f59e0b",
    mono: true,
    items: [
      ".env",
      "appsettings.json",
      "secrets.yaml",
      "values.yaml",
      "application.properties",
      "application.yml",
      "config.toml",
      "config.yaml",
    ],
  },
  {
    title: "Secret Files",
    icon: <KeyIcon sx={{ fontSize: 20 }} />,
    color: "#22d3ee",
    items: [
      "SSL / TLS Certificates",
      "Private Keys",
      "Java / Android Keystores",
      "iOS Provisioning Profiles",
      "Cloud Credentials",
      "SSH Keys",
      "GPG / PGP Keys",
    ],
  },
];

export function EcosystemsSection(): ReactElement {
  return (
    <Box component="section" id="ecosystems" sx={{ position: "relative" }}>
      <SectionContainer>
        <Typography variant="h2" textAlign="center" sx={{ mb: 1 }}>
          Works with your stack
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 6, maxWidth: 540, mx: "auto" }}
        >
          Analyze dependencies, manage secrets, and store sensitive files across every major
          ecosystem
        </Typography>

        <Grid container spacing={3}>
          {categories.map((cat) => (
            <Grid key={cat.title} size={{ xs: 12, md: 4 }}>
              <GlassCard hoverGlow={false} sx={{ height: "100%", p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: `${cat.color}1a`,
                      color: cat.color,
                    }}
                  >
                    {cat.icon}
                  </Box>
                  <Typography variant="subtitle2" sx={{ letterSpacing: "0.04em" }}>
                    {cat.title}
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  {cat.items.map((item) => (
                    <Stack key={item} direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: cat.color,
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          ...(cat.mono && {
                            fontFamily: "var(--font-jetbrains), monospace",
                            fontSize: "0.8rem",
                          }),
                        }}
                      >
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </SectionContainer>
    </Box>
  );
}
