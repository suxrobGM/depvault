"use client";

import type { ReactElement } from "react";
import { Grid } from "@mui/material";
import { AboutCard } from "./overview/about-card";
import { FilesCard } from "./overview/files-card";
import { LicenseComplianceCard } from "./overview/license-compliance-card";
import { QuickStatsCard } from "./overview/quick-stats-card";
import { SecretScanningCard } from "./overview/secret-scanning-card";

interface OverviewTabProps {
  projectId: string;
}

export function OverviewTab(props: OverviewTabProps): ReactElement {
  const { projectId } = props;

  return (
    <Grid container spacing={3} className="vault-fade-up vault-delay-2">
      <Grid size={{ xs: 12, md: 8 }}>
        <AboutCard projectId={projectId} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <QuickStatsCard projectId={projectId} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <FilesCard projectId={projectId} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <SecretScanningCard projectId={projectId} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <LicenseComplianceCard projectId={projectId} />
      </Grid>
    </Grid>
  );
}
