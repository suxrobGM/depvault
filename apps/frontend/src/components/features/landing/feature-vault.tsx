import type { ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { BrowserWindow } from "@/components/ui/browser-window";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";
import { IconBox } from "@/components/ui/icon-box";

const diffLines = [
  { type: "header", text: "── .env (production vs staging) ──" },
  { type: "same", text: "  DATABASE_URL=postgresql://..." },
  { type: "same", text: "  REDIS_URL=redis://cache:6379" },
  { type: "remove", text: "- API_KEY=sk_live_a8f2...9d1e" },
  { type: "add", text: "+ API_KEY=sk_test_7b3c...4f2a" },
  { type: "same", text: "  JWT_SECRET=••••••••••••" },
  { type: "remove", text: "- STRIPE_WEBHOOK=whsec_live..." },
  { type: "add", text: "+ STRIPE_WEBHOOK=whsec_test..." },
  { type: "missing", text: "? SENTRY_DSN (missing in staging)" },
];

const lineColors: Record<string, { color: string; bg: string }> = {
  header: { color: "var(--mui-palette-text-secondary)", bg: "transparent" },
  same: { color: "var(--mui-palette-text-secondary)", bg: "transparent" },
  remove: { color: "var(--mui-palette-error-main)", bg: "rgba(248, 113, 113, 0.06)" },
  add: { color: "var(--mui-palette-success-main)", bg: "rgba(52, 211, 153, 0.06)" },
  missing: { color: "var(--mui-palette-warning-main)", bg: "rgba(251, 191, 36, 0.06)" },
};

export function FeatureVault(): ReactElement {
  return (
    <Grid container spacing={4} alignItems="center" direction="row-reverse">
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
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          Encrypt environment variables and secret files — SSL certificates, private keys,
          keystores, cloud credentials — with AES-256-GCM in a zero-plaintext vault. Role-based
          access (owner, editor, viewer) controls who can read or modify secrets, and every action
          is recorded in an append-only audit trail.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="AES-256-GCM" size="small" variant="outlined" color="secondary" />
          <Chip label="Env Diff" size="small" variant="outlined" color="secondary" />
          <Chip label="Secret Files" size="small" variant="outlined" color="secondary" />
          <Chip label="RBAC" size="small" variant="outlined" color="secondary" />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard hoverGlow={false} sx={{ overflow: "hidden" }}>
          <BrowserWindow title="env diff — production ↔ staging" />
          <Box sx={{ p: 1.5 }}>
            {diffLines.map((line, i) => {
              const style = lineColors[line.type]!;
              return (
                <Box
                  key={i}
                  sx={{
                    px: 1.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: style.bg,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      color: style.color,
                      fontSize: "0.7rem",
                      lineHeight: 1.8,
                      ...(line.type === "header" && { fontWeight: 600, fontSize: "0.65rem" }),
                    }}
                  >
                    {line.text}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
