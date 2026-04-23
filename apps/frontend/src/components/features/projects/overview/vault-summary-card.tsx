"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { CardContent, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { LinkButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { SecretFileListResponse } from "@/types/api/secret-file";
import type { VaultListResponse } from "@/types/api/vault";

interface VaultSummaryCardProps {
  projectId: string;
}

export function VaultSummaryCard(props: VaultSummaryCardProps): ReactElement {
  const { projectId } = props;

  const { data: vaults } = useApiQuery<VaultListResponse>(["vaults", projectId, "overview"], () =>
    client.api.projects({ id: projectId }).vaults.get(),
  );

  const { data: secretFilesData } = useApiQuery<SecretFileListResponse>(
    ["secret-files", projectId, "overview"],
    () => client.api.projects({ id: projectId }).secrets.get({ query: { page: 1, limit: 1 } }),
  );

  const vaultCount = vaults?.length ?? 0;
  const variableCount =
    vaults?.reduce((sum: number, v) => sum + Number(v.variableCount ?? 0), 0) ?? 0;
  const secretFileCount = secretFilesData?.pagination.total ?? 0;

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
          <IconBox color="var(--mui-palette-success-main)" size={40}>
            <VpnKeyIcon sx={{ fontSize: 22 }} />
          </IconBox>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
            }}
          >
            Vault Summary
          </Typography>
        </Stack>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Vaults
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {vaultCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Variables
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {variableCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Secret Files
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {secretFileCount}
            </Typography>
          </Grid>
        </Grid>
        <LinkButton
          href={ROUTES.projectVault(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Go to Vault
        </LinkButton>
      </CardContent>
    </GlassCard>
  );
}
