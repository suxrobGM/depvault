import type { ReactElement } from "react";
import {
  ContentCopy as CopyIcon,
  Schedule as ScheduleIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { Box, Chip, Grid, IconButton, Stack, Typography } from "@mui/material";
import { GlassCard, GradientText, IconBox } from "@/components/ui/cards";
import { BrowserWindow } from "@/components/ui/containers";

export function FeatureSharing(): ReactElement {
  return (
    <Grid
      container
      spacing={4}
      sx={{
        alignItems: "center",
      }}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <IconBox color="#06b6d4">
            <ShareIcon />
          </IconBox>
          <GradientText
            variant="h4"
            component="h3"
            gradient="linear-gradient(135deg, #06b6d4, #22d3ee, #06b6d4)"
          >
            Secret Sharing
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
          Generate one-time encrypted links where the decryption key lives only in the URL — the
          server never sees it. Set expiration times, add optional passwords, and stop credentials
          from sitting in Slack or email history. Every link creation, access, and expiration is
          tracked in the audit log.
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
          }}
        >
          <Chip label="One-Time Links" size="small" variant="outlined" color="info" />
          <Chip label="Auto-Expiration" size="small" variant="outlined" color="info" />
          <Chip label="Audit Trail" size="small" variant="outlined" color="info" />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <GlassCard hoverGlow={false} sx={{ overflow: "hidden" }}>
          <BrowserWindow title="share secret" />
          <Box sx={{ p: 2.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                mb: 1,
                display: "block",
              }}
            >
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
                https://depvault.com/s/x7Kp2mNq9vBt...
              </Typography>
              <IconButton size="small" aria-label="Copy link" sx={{ color: "text.secondary" }}>
                <CopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Stack direction="row" spacing={2}>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: "center",
                }}
              >
                <ScheduleIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                  }}
                >
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
                  color: "var(--mui-palette-info-light)",
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
                  color: "var(--mui-palette-warning-main)",
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
