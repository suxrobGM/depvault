import type { ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";

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
  header: { color: "#94a3b8", bg: "transparent" },
  same: { color: "#94a3b8", bg: "transparent" },
  remove: { color: "#f87171", bg: "rgba(248, 113, 113, 0.06)" },
  add: { color: "#34d399", bg: "rgba(52, 211, 153, 0.06)" },
  missing: { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.06)" },
};

export function FeatureVault(): ReactElement {
  return (
    <Grid container spacing={4} alignItems="center" direction="row-reverse">
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(245, 158, 11, 0.1)",
              color: "#f59e0b",
            }}
          >
            <LockIcon />
          </Box>
          <GradientText
            variant="h4"
            component="h3"
            gradient="linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)"
          >
            Environment Vault
          </GradientText>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          Store environment variables with AES-256-GCM encryption. Compare environments
          side-by-side, detect missing variables, and keep your team in sync with onboarding
          checklists.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip label="AES-256-GCM" size="small" variant="outlined" color="secondary" />
          <Chip label="Env Diff" size="small" variant="outlined" color="secondary" />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard hoverGlow={false} sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: "vault.glassBorder",
            }}
          >
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f87171" }} />
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#fbbf24" }} />
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#34d399" }} />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              env diff — production ↔ staging
            </Typography>
          </Box>
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
