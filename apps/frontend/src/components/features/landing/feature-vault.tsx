import type { ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, GradientText, IconBox } from "@/components/ui/cards";
import { BrowserWindow } from "@/components/ui/containers";

const envVars = [
  { key: "DATABASE_URL", value: "postgresql://••••••••" },
  { key: "API_KEY", value: "sk_live_••••••••" },
  { key: "JWT_SECRET", value: "••••••••••••" },
  { key: "STRIPE_WEBHOOK", value: "whsec_••••••••" },
  { key: "SENTRY_DSN", value: "https://••••••••" },
];

const envTabs = ["DEV", "STAGING", "PROD"];

export function FeatureVault(): ReactElement {
  return (
    <Grid
      container
      spacing={4}
      direction="row-reverse"
      sx={{
        alignItems: "center",
      }}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <IconBox color="#f59e0b">
            <LockIcon />
          </IconBox>
          <GradientText
            variant="h4"
            component="h3"
            gradient="linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)"
          >
            Environment Vault
          </GradientText>
        </Box>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.8,
            mb: 2,
          }}
        >
          End-to-end encrypt environment variables and secret files — SSL certificates, private
          keys, keystores, cloud credentials — with AES-256-GCM. Secrets are encrypted in your
          browser before they reach the server. Even we can&apos;t read them.
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
          }}
        >
          <Chip label="Zero-Knowledge" size="small" variant="outlined" color="secondary" />
          <Chip label="AES-256-GCM" size="small" variant="outlined" color="secondary" />
          <Chip label="Version History" size="small" variant="outlined" color="secondary" />
          <Chip label="Secret Files" size="small" variant="outlined" color="secondary" />
          <Chip label="RBAC" size="small" variant="outlined" color="secondary" />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard hoverGlow={false} sx={{ overflow: "hidden" }}>
          <BrowserWindow title="vault — production" />
          <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
              {envTabs.map((tab) => (
                <Box
                  key={tab}
                  sx={{
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 1,
                    fontSize: "0.65rem",
                    fontWeight: tab === "PROD" ? 600 : 400,
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: tab === "PROD" ? "primary.main" : "text.secondary",
                    bgcolor: tab === "PROD" ? "rgba(16, 185, 129, 0.12)" : "transparent",
                    border: 1,
                    borderColor:
                      tab === "PROD" ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {tab}
                </Box>
              ))}
            </Stack>
          </Box>
          <Box sx={{ px: 1.5, pb: 1.5 }}>
            {envVars.map((v) => (
              <Box
                key={v.key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 0.5,
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" },
                }}
              >
                <LockIcon sx={{ fontSize: 11, color: "primary.main", opacity: 0.7 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    color: "text.primary",
                    minWidth: 130,
                  }}
                >
                  {v.key}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: "0.7rem",
                    color: "text.secondary",
                  }}
                >
                  {v.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
