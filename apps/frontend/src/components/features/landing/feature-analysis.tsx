import type { ReactElement } from "react";
import { Security as SecurityIcon } from "@mui/icons-material";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { BrowserWindow } from "@/components/ui/browser-window";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";
import { IconBox } from "@/components/ui/icon-box";

const mockRows = [
  { name: "lodash", current: "4.17.15", latest: "4.17.21", severity: "warning" },
  { name: "express", current: "4.18.2", latest: "4.21.0", severity: "success" },
  { name: "jsonwebtoken", current: "8.5.1", latest: "9.0.2", severity: "error" },
  { name: "axios", current: "1.6.0", latest: "1.7.9", severity: "warning" },
  { name: "bcrypt", current: "5.1.1", latest: "5.1.1", severity: "success" },
];

const severityColors: Record<string, { bg: string; color: string; label: string }> = {
  error: {
    bg: "rgba(248, 113, 113, 0.12)",
    color: "var(--mui-palette-error-main)",
    label: "Critical",
  },
  warning: {
    bg: "rgba(251, 191, 36, 0.12)",
    color: "var(--mui-palette-warning-main)",
    label: "Outdated",
  },
  success: {
    bg: "rgba(52, 211, 153, 0.12)",
    color: "var(--mui-palette-success-main)",
    label: "Up to date",
  },
};

export function FeatureAnalysis(): ReactElement {
  return (
    <Grid container spacing={4} alignItems="center">
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <IconBox color="#10b981">
            <SecurityIcon />
          </IconBox>
          <GradientText variant="h4" component="h3">
            Dependency Analysis
          </GradientText>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          Connect your GitHub repo or upload dependency files — package.json, requirements.txt,
          Cargo.toml, go.mod, and more. Instantly detect outdated packages, known CVEs, and license
          conflicts across your entire stack with an interactive dependency tree.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="8+ Ecosystems" size="small" variant="outlined" color="primary" />
          <Chip label="CVE Detection" size="small" variant="outlined" color="primary" />
          <Chip label="Repo Scanning" size="small" variant="outlined" color="primary" />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard hoverGlow={false} sx={{ overflow: "hidden" }}>
          <BrowserWindow title="analysis — package.json" />
          <Box sx={{ p: 0 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px 90px",
                gap: 0,
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: "vault.glassBorder",
                bgcolor: "rgba(255,255,255,0.02)",
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Package
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Current
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Latest
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Status
              </Typography>
            </Box>
            {mockRows.map((row) => {
              const s = severityColors[row.severity]!;
              return (
                <Box
                  key={row.name}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 80px 90px",
                    gap: 0,
                    px: 2,
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: "vault.glassBorder",
                    "&:last-child": { borderBottom: 0 },
                    "&:hover": { bgcolor: "rgba(255,255,255,0.02)" },
                  }}
                >
                  <Typography variant="caption" fontFamily="var(--font-jetbrains), monospace">
                    {row.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontFamily="var(--font-jetbrains), monospace"
                    color="text.secondary"
                  >
                    {row.current}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontFamily="var(--font-jetbrains), monospace"
                    color="text.secondary"
                  >
                    {row.latest}
                  </Typography>
                  <Chip
                    label={s.label}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      bgcolor: s.bg,
                      color: s.color,
                      fontWeight: 600,
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
