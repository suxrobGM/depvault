"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, Shield as ShieldIcon } from "@mui/icons-material";
import { CardActions, CardContent, CardHeader, Chip, Grid, Stack, Typography } from "@mui/material";
import { IconBox, Surface } from "@/components/ui/cards";
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
    <Surface accent="primary" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <IconBox color="var(--mui-palette-primary-main)" size={40}>
            <ShieldIcon sx={{ fontSize: 22 }} />
          </IconBox>
        }
        title="Secret Scanning"
      />
      <CardContent sx={{ p: 3 }}>
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
      </CardContent>
      <CardActions>
        <LinkButton
          href={ROUTES.projectSecretScanning(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          {scanSummary?.lastScan ? "View Details" : "Set Up Scanning"}
        </LinkButton>
      </CardActions>
    </Surface>
  );
}
