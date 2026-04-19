"use client";

import { useState, type ReactElement } from "react";
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  Shield as ShieldIcon,
} from "@mui/icons-material";
import { Box, Button, CardContent, Chip, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { PageHeader } from "@/components/ui/containers";
import { LinkButton } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { ProjectResponse } from "@/types/api/project";
import type { ScanResponse, ScanSummaryResponse } from "@/types/api/secret-scan";
import { DetectionsTable } from "./detections-table";
import { PatternManager } from "./pattern-manager";
import { ScanHistory } from "./scan-history";

interface SecretScanningPageProps {
  projectId: string;
}

const SEVERITY_CONFIG = [
  { key: "critical" as const, label: "Critical", color: "var(--mui-palette-error-main)" },
  { key: "high" as const, label: "High", color: "var(--mui-palette-warning-main)" },
  { key: "medium" as const, label: "Medium", color: "var(--mui-palette-info-main)" },
  { key: "low" as const, label: "Low", color: "var(--mui-palette-success-main)" },
];

export function SecretScanningPage(props: SecretScanningPageProps): ReactElement {
  const { projectId } = props;
  const [activeSection, setActiveSection] = useState<"detections" | "history" | "patterns">(
    "detections",
  );

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: summary, isLoading: summaryLoading } = useApiQuery<ScanSummaryResponse>(
    ["scan-summary", projectId],
    () => client.api.projects({ id: projectId })["scan-summary"].get(),
    { errorMessage: "Failed to load scan summary" },
  );

  const triggerScan = useApiMutation<ScanResponse>(
    () => client.api.projects({ id: projectId }).scans.post(),
    {
      invalidateKeys: [
        ["scan-summary", projectId],
        ["scans", projectId],
        ["detections", projectId],
      ],
      successMessage: "Scan started successfully",
      errorMessage: "Failed to start scan",
    },
  );

  const isViewer = project?.currentUserRole === "VIEWER";

  const isScanning =
    summary?.lastScan?.status === "RUNNING" || summary?.lastScan?.status === "PENDING";

  const totalOpen = summary
    ? summary.openDetections.critical +
      summary.openDetections.high +
      summary.openDetections.medium +
      summary.openDetections.low
    : 0;

  return (
    <Box>
      <PageHeader
        title="Secret Scanning"
        subtitle="Detect accidentally committed secrets in your repository"
        breadcrumbs={[
          { label: "Projects", href: ROUTES.projects },
          { label: project?.name ?? "...", href: ROUTES.projectOverview(projectId) },
          { label: "Secret Scanning" },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <LinkButton
              href={ROUTES.projectOverview(projectId)}
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
            >
              Back to Project
            </LinkButton>
            {!isViewer && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayIcon />}
                onClick={() => triggerScan.mutate()}
                disabled={triggerScan.isPending || isScanning}
              >
                {isScanning ? "Scanning..." : "Run Scan"}
              </Button>
            )}
          </Stack>
        }
      />
      <Grid container spacing={3} className="vault-fade-up vault-delay-1">
        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <IconBox color="var(--mui-palette-warning-main)" size={40}>
                  <ShieldIcon sx={{ fontSize: 22 }} />
                </IconBox>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  Last Scan
                </Typography>
              </Stack>
              {summaryLoading ? (
                <Skeleton variant="text" width="60%" />
              ) : summary?.lastScan ? (
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                    }}
                  >
                    <Chip
                      label={summary.lastScan.status}
                      size="small"
                      color={
                        summary.lastScan.status === "COMPLETED"
                          ? "success"
                          : summary.lastScan.status === "FAILED"
                            ? "error"
                            : "warning"
                      }
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {new Date(summary.lastScan.createdAt).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {summary.lastScan.commitsScanned} commits scanned
                  </Typography>
                </Stack>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  No scans yet
                </Typography>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <GlassCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                }}
              >
                Open Detections
              </Typography>
              {summaryLoading ? (
                <Skeleton variant="rectangular" height={60} />
              ) : (
                <Grid container spacing={2}>
                  {SEVERITY_CONFIG.map((s) => (
                    <Grid size={3} key={s.key}>
                      <Stack
                        spacing={0.5}
                        sx={{
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            color: s.color,
                          }}
                        >
                          {summary?.openDetections[s.key] ?? 0}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                          }}
                        >
                          {s.label}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  Total open: {totalOpen} | Resolved: {summary?.totalResolved ?? 0}
                </Typography>
              </Stack>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 4, mb: 2 }}
        className="vault-fade-up vault-delay-2"
      >
        {(["detections", "history", ...(isViewer ? [] : ["patterns" as const])] as const).map(
          (section) => (
            <Chip
              key={section}
              label={
                section === "detections"
                  ? "Detections"
                  : section === "history"
                    ? "Scan History"
                    : "Patterns"
              }
              onClick={() => setActiveSection(section)}
              variant={activeSection === section ? "filled" : "outlined"}
              color={activeSection === section ? "primary" : "default"}
            />
          ),
        )}
      </Stack>
      <Box className="vault-fade-up vault-delay-3">
        {activeSection === "detections" && <DetectionsTable projectId={projectId} />}
        {activeSection === "history" && <ScanHistory projectId={projectId} />}
        {activeSection === "patterns" && <PatternManager projectId={projectId} />}
      </Box>
    </Box>
  );
}
