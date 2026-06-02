"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { CardActions, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { IconBox, Surface } from "@/components/ui/cards";
import { LinkButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { RepoMapResponseDto } from "@/types/api/repo";
import type { SecretFileListResponseDto } from "@/types/api/secret-file";

interface VaultSummaryCardProps {
  projectId: string;
}

export function VaultSummaryCard(props: VaultSummaryCardProps): ReactElement {
  const { projectId } = props;

  const { data: repoMap } = useApiQuery<RepoMapResponseDto>(queryKeys.repo.map(projectId), () =>
    client.api.projects({ id: projectId })["repo-map"].get(),
  );

  const { data: secretFilesData } = useApiQuery<SecretFileListResponseDto>(
    queryKeys.secretFiles.overview(projectId),
    () => client.api.projects({ id: projectId }).secrets.get({ query: { page: 1, limit: 1 } }),
  );

  const apps = repoMap?.apps ?? [];
  const appCount = apps.length;
  const configFileCount = apps.reduce((sum, app) => sum + app.configFiles.length, 0);
  const secretFileCount = secretFilesData?.pagination.total ?? 0;

  return (
    <Surface accent="success" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <IconBox color="var(--mui-palette-success-main)" size={40}>
            <VpnKeyIcon sx={{ fontSize: 22 }} />
          </IconBox>
        }
        title="Vault Summary"
      />
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={4}>
            <Typography variant="captionMuted">Apps</Typography>
            <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
              {appCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="captionMuted">Config Files</Typography>
            <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
              {configFileCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="captionMuted">Secret Files</Typography>
            <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
              {secretFileCount}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions>
        <LinkButton
          href={ROUTES.projectVault(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Go to Vault
        </LinkButton>
      </CardActions>
    </Surface>
  );
}
