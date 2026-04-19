import type { ReactElement, ReactNode } from "react";
import {
  Code as CodeIcon,
  InsertDriveFile as FileIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";

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
    color: "var(--mui-palette-primary-main)",
    items: ["Node.js", "Python", "Rust", ".NET", "Go", "Java / Kotlin", "Ruby", "PHP"],
  },
  {
    title: "Config Formats",
    icon: <FileIcon sx={{ fontSize: 20 }} />,
    color: "var(--mui-palette-secondary-main)",
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
    color: "var(--mui-palette-info-light)",
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
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            mb: 1,
          }}
        >
          Works with your stack
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            mb: 6,
            maxWidth: 540,
            mx: "auto",
          }}
        >
          Analyze dependencies, manage secrets, and store sensitive files across every major
          ecosystem
        </Typography>

        <Grid container spacing={3}>
          {categories.map((cat) => (
            <Grid key={cat.title} size={{ xs: 12, md: 4 }}>
              <GlassCard hoverGlow={false} sx={{ height: "100%", p: 3 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    mb: 2.5,
                  }}
                >
                  <IconBox color={cat.color} size={36}>
                    {cat.icon}
                  </IconBox>
                  <Typography variant="subtitle2" sx={{ letterSpacing: "0.04em" }}>
                    {cat.title}
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  {cat.items.map((item) => (
                    <Stack
                      key={item}
                      direction="row"
                      spacing={1.5}
                      sx={{
                        alignItems: "center",
                      }}
                    >
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
                        sx={{
                          color: "text.secondary",

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
