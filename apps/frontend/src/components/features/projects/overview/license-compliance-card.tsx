"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, Gavel as LicenseIcon } from "@mui/icons-material";
import { CardActions, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { IconBox, Surface } from "@/components/ui/cards";
import { LinkButton } from "@/components/ui/inputs";
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
    <Surface accent="primary" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <IconBox color="var(--mui-palette-primary-main)" size={40}>
            <LicenseIcon sx={{ fontSize: 22 }} />
          </IconBox>
        }
        title="License Compliance"
      />
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={3}>
            <Typography variant="captionMuted">Total</Typography>
            <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
              {total}
            </Typography>
          </Grid>
          <Grid size={3}>
            <Typography variant="captionMuted">Allowed</Typography>
            <Typography
              variant="statValue"
              sx={{
                fontSize: "1rem",
                color: allowed > 0 ? "var(--mui-palette-success-main)" : "text.secondary",
              }}
            >
              {allowed}
            </Typography>
          </Grid>
          <Grid size={3}>
            <Typography variant="captionMuted">Warned</Typography>
            <Typography
              variant="statValue"
              sx={{
                fontSize: "1rem",
                color: warned > 0 ? "var(--mui-palette-warning-main)" : "text.secondary",
              }}
            >
              {warned}
            </Typography>
          </Grid>
          <Grid size={3}>
            <Typography variant="captionMuted">Blocked</Typography>
            <Typography
              variant="statValue"
              sx={{
                fontSize: "1rem",
                color: blocked > 0 ? "var(--mui-palette-error-main)" : "text.secondary",
              }}
            >
              {blocked}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions>
        <LinkButton
          href={ROUTES.projectLicenses(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Go to Licenses
        </LinkButton>
      </CardActions>
    </Surface>
  );
}
