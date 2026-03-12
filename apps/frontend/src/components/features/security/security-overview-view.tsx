"use client";

import type { ReactElement } from "react";
import {
  BugReport as BugIcon,
  GppBad as DetectionIcon,
  GppGood as ResolvedIcon,
  Radar as ScanIcon,
  Security as SecurityIcon,
} from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { SecurityOverviewResponse } from "@/types/api/security";

export function SecurityOverviewView(): ReactElement {
  const { data, isLoading } = useApiQuery<SecurityOverviewResponse>(
    ["security-overview"],
    () => client.api.security.overview.get(),
    { errorMessage: "Failed to load security overview" },
  );

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ height: 120 }}>
                <Box sx={{ bgcolor: "action.hover", borderRadius: 1, height: "100%" }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!data) return <Box />;

  const vulns = data.vulnerabilities;
  const scans = data.secretScans;

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <StatCard
          icon={<BugIcon />}
          title="Total Vulnerabilities"
          value={vulns.total}
          color="error"
        />
        <StatCard
          icon={<SecurityIcon />}
          title="Projects Monitored"
          value={data.projectCount}
          color="primary"
        />
        <StatCard icon={<ScanIcon />} title="Secret Scans" value={scans.totalScans} color="info" />
        <StatCard
          icon={<ResolvedIcon />}
          title="Resolved Detections"
          value={scans.resolvedDetections}
          color="success"
        />
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vulnerabilities by Severity
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <SeverityRow label="Critical" count={vulns.critical} color="error" />
                <SeverityRow label="High" count={vulns.high} color="error" />
                <SeverityRow label="Medium" count={vulns.medium} color="warning" />
                <SeverityRow label="Low" count={vulns.low} color="info" />
                <SeverityRow label="None" count={vulns.none} color="default" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Secret Scan Detections
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DetectionIcon color="warning" fontSize="small" />
                    <Typography variant="body2">Open Detections</Typography>
                  </Stack>
                  <Chip
                    label={scans.openDetections}
                    size="small"
                    color={scans.openDetections > 0 ? "warning" : "default"}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ResolvedIcon color="success" fontSize="small" />
                    <Typography variant="body2">Resolved</Typography>
                  </Stack>
                  <Chip label={scans.resolvedDetections} size="small" color="success" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

interface StatCardProps {
  icon: ReactElement;
  title: string;
  value: number;
  color: "error" | "primary" | "info" | "success" | "warning";
}

function StatCard(props: StatCardProps): ReactElement {
  const { icon, title, value, color } = props;

  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined" className="vault-fade-up">
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${color}.main`,
                color: `${color}.contrastText`,
                opacity: 0.9,
              }}
            >
              {icon}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Stack>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

interface SeverityRowProps {
  label: string;
  count: number;
  color: "error" | "warning" | "info" | "default";
}

function SeverityRow(props: SeverityRowProps): ReactElement {
  const { label, count, color } = props;

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2">{label}</Typography>
      <Chip label={count} size="small" color={color} />
    </Stack>
  );
}
