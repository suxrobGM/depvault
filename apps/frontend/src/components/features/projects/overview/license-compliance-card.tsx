"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, Gavel as LicenseIcon } from "@mui/icons-material";
import { Button, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { LicenseComplianceSummary } from "@/types/api/license-rule";

interface LicenseComplianceCardProps {
  projectId: string;
}

export function LicenseComplianceCard(props: LicenseComplianceCardProps): ReactElement {
  const { projectId } = props;

  const { data } = useApiQuery<LicenseComplianceSummary>(
    ["license-compliance", projectId, "overview"],
    () =>
      client.api.projects({ id: projectId })["license-rules"].compliance.get({
        query: { page: 1, limit: 1 },
      }),
  );

  const total = data?.total ?? 0;
  const allowed = data?.allowed ?? 0;
  const warned = data?.warned ?? 0;
  const blocked = data?.blocked ?? 0;

  return (
    <GlassCard sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          <IconBox color="var(--mui-palette-warning-main)" size={40}>
            <LicenseIcon sx={{ fontSize: 22 }} />
          </IconBox>
          <Typography variant="subtitle1" fontWeight={600}>
            License Compliance
          </Typography>
        </Stack>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={3}>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {total}
            </Typography>
          </Grid>
          <Grid size={3}>
            <Typography variant="caption" color="text.secondary">
              Allowed
            </Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1.2}
              sx={{ color: allowed > 0 ? "var(--mui-palette-success-main)" : "text.secondary" }}
            >
              {allowed}
            </Typography>
          </Grid>
          <Grid size={3}>
            <Typography variant="caption" color="text.secondary">
              Warned
            </Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1.2}
              sx={{ color: warned > 0 ? "var(--mui-palette-warning-main)" : "text.secondary" }}
            >
              {warned}
            </Typography>
          </Grid>
          <Grid size={3}>
            <Typography variant="caption" color="text.secondary">
              Blocked
            </Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1.2}
              sx={{ color: blocked > 0 ? "var(--mui-palette-error-main)" : "text.secondary" }}
            >
              {blocked}
            </Typography>
          </Grid>
        </Grid>
        <Button
          component={Link}
          href={ROUTES.projectLicenses(projectId) as Route}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Go to Licenses
        </Button>
      </CardContent>
    </GlassCard>
  );
}
