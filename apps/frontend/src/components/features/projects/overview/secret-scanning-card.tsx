"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, Shield as ShieldIcon } from "@mui/icons-material";
import { CardContent, Chip, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { LinkButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { ScanSummaryResponse } from "@/types/api/secret-scan";

interface SecretScanningCardProps {
  projectId: string;
}

export function SecretScanningCard(props: SecretScanningCardProps): ReactElement {
  const { projectId } = props;

  const { data: scanSummary } = useApiQuery<ScanSummaryResponse>(
    ["scan-summary", projectId, "overview"],
    () => client.api.projects({ id: projectId })["scan-summary"].get(),
  );

  return (
    <GlassCard sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            mb: 2.5,
          }}
        >
          <IconBox color="var(--mui-palette-primary-main)" size={40}>
            <ShieldIcon sx={{ fontSize: 22 }} />
          </IconBox>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
            }}
          >
            Secret Scanning
          </Typography>
        </Stack>
        {scanSummary?.lastScan ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={3}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Critical
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "error.main",
                  }}
                >
                  {scanSummary.openDetections.critical}
                </Typography>
              </Grid>
              <Grid size={3}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  High
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "warning.main",
                  }}
                >
                  {scanSummary.openDetections.high}
                </Typography>
              </Grid>
              <Grid size={3}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Medium
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "info.main",
                  }}
                >
                  {scanSummary.openDetections.medium}
                </Typography>
              </Grid>
              <Grid size={3}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Low
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "success.main",
                  }}
                >
                  {scanSummary.openDetections.low}
                </Typography>
              </Grid>
            </Grid>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mb: 2,
              }}
            >
              <Chip
                label={scanSummary.lastScan.status}
                size="small"
                color={scanSummary.lastScan.status === "COMPLETED" ? "success" : "warning"}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                {new Date(scanSummary.lastScan.createdAt).toLocaleDateString()}
              </Typography>
            </Stack>
          </>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2.5,
            }}
          >
            No scans yet. Run your first scan to detect leaked secrets.
          </Typography>
        )}
        <LinkButton
          href={ROUTES.projectSecretScanning(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          {scanSummary?.lastScan ? "View Details" : "Set Up Scanning"}
        </LinkButton>
      </CardContent>
    </GlassCard>
  );
}
