import type { ReactElement } from "react";
import {
  ContentCopy as CopyIcon,
  Schedule as ScheduleIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { Box, Chip, Grid, IconButton, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";

export function FeatureSharing(): ReactElement {
  return (
    <Grid container spacing={4} alignItems="center">
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
              bgcolor: "rgba(6, 182, 212, 0.1)",
              color: "#06b6d4",
            }}
          >
            <ShareIcon />
          </Box>
          <GradientText
            variant="h4"
            component="h3"
            gradient="linear-gradient(135deg, #06b6d4, #22d3ee, #06b6d4)"
          >
            Secret Sharing
          </GradientText>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          Generate one-time encrypted links for sharing secrets. Set expiration times, add optional
          passwords, and ensure zero-knowledge delivery to your team.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip label="One-Time Links" size="small" variant="outlined" color="info" />
          <Chip label="Zero-Knowledge" size="small" variant="outlined" color="info" />
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
              share secret
            </Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Secure link generated
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "rgba(255,255,255,0.03)",
                border: 1,
                borderColor: "vault.glassBorder",
                borderRadius: 1.5,
                px: 2,
                py: 1,
                mb: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  color: "primary.main",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.7rem",
                }}
              >
                https://depvault.app/s/x7Kp2mNq9vBt...
              </Typography>
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                <CopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Stack direction="row" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <ScheduleIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  Expires in 24h
                </Typography>
              </Stack>
              <Chip
                label="One-time access"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(6, 182, 212, 0.12)",
                  color: "#22d3ee",
                  fontWeight: 600,
                }}
              />
              <Chip
                label="Password protected"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(245, 158, 11, 0.12)",
                  color: "#fbbf24",
                  fontWeight: 600,
                }}
              />
            </Stack>
          </Box>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
