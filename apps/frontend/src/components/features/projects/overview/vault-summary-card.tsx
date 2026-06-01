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
import type { SecretFileListResponseDto } from "@/types/api/secret-file";
import type { VaultListResponseDto } from "@/types/api/vault";

interface VaultSummaryCardProps {
  projectId: string;
}

export function VaultSummaryCard(props: VaultSummaryCardProps): ReactElement {
  const { projectId } = props;

  const { data: vaults } = useApiQuery<VaultListResponseDto>(
    queryKeys.vaults.overview(projectId),
    () => client.api.projects({ id: projectId }).vaults.get(),
  );

  const { data: secretFilesData } = useApiQuery<SecretFileListResponseDto>(
    queryKeys.secretFiles.overview(projectId),
    () => client.api.projects({ id: projectId }).secrets.get({ query: { page: 1, limit: 1 } }),
  );

  const vaultCount = vaults?.length ?? 0;
  const variableCount =
    vaults?.reduce((sum: number, v) => sum + Number(v.variableCount ?? 0), 0) ?? 0;
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
            <Typography variant="captionMuted">Vaults</Typography>
            <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
              {vaultCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="captionMuted">Variables</Typography>
            <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
              {variableCount}
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
