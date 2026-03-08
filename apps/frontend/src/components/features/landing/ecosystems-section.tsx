import type { ReactElement } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { SectionContainer } from "@/components/ui/section-container";

const dependencyEcosystems = [
  "Node.js",
  "Python",
  "Rust",
  ".NET",
  "Go",
  "Java/Kotlin",
  "Ruby",
  "PHP",
];

const configFormats = [
  ".env",
  "appsettings.json",
  "secrets.yaml",
  "values.yaml",
  "application.properties",
  "application.yml",
  "config.toml",
  "config.yaml",
];

const secretFileTypes = [
  "SSL/TLS Certificates",
  "Private Keys",
  "Java/Android Keystores",
  "iOS Provisioning Profiles",
  "Cloud Credentials",
  "SSH Keys",
  "GPG/PGP Keys",
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

        <Stack spacing={5} alignItems="center">
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ mb: 2, display: "block", letterSpacing: "0.15em" }}
            >
              Dependency Ecosystems
            </Typography>
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5}>
              {dependencyEcosystems.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  variant="outlined"
                  sx={{
                    borderColor: "rgba(16, 185, 129, 0.25)",
                    color: "text.primary",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                    py: 2,
                    px: 0.5,
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "rgba(16, 185, 129, 0.08)",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="overline"
              color="secondary.main"
              sx={{ mb: 2, display: "block", letterSpacing: "0.15em" }}
            >
              Config Formats
            </Typography>
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5}>
              {configFormats.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  variant="outlined"
                  sx={{
                    borderColor: "rgba(245, 158, 11, 0.25)",
                    color: "text.primary",
                    fontWeight: 500,
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: "0.8rem",
                    py: 2,
                    px: 0.5,
                    "&:hover": {
                      borderColor: "secondary.main",
                      bgcolor: "rgba(245, 158, 11, 0.08)",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="overline"
              color="info.main"
              sx={{ mb: 2, display: "block", letterSpacing: "0.15em" }}
            >
              Secret Files
            </Typography>
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5}>
              {secretFileTypes.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  variant="outlined"
                  sx={{
                    borderColor: "rgba(6, 182, 212, 0.25)",
                    color: "text.primary",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                    py: 2,
                    px: 0.5,
                    "&:hover": {
                      borderColor: "info.main",
                      bgcolor: "rgba(6, 182, 212, 0.08)",
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </SectionContainer>
    </Box>
  );
}
