"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { Button, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { SecretFileListResponse } from "@/types/api/secret-file";
import type { VaultGroupListResponse } from "@/types/api/vault-group";

interface VaultSummaryCardProps {
  projectId: string;
}

export function VaultSummaryCard(props: VaultSummaryCardProps): ReactElement {
  const { projectId } = props;

  const { data: vaultGroups } = useApiQuery<VaultGroupListResponse>(
    ["vault-groups", projectId, "overview"],
    () => client.api.projects({ id: projectId })["vault-groups"].get(),
  );

  const { data: secretFilesData } = useApiQuery<SecretFileListResponse>(
    ["secret-files", projectId, "overview"],
    () => client.api.projects({ id: projectId }).secrets.get({ query: { page: 1, limit: 1 } }),
  );

  const groupCount = vaultGroups?.length ?? 0;
  const variableCount = vaultGroups?.reduce((sum, g) => sum + (g.variableCount ?? 0), 0) ?? 0;
  const secretFileCount = secretFilesData?.pagination.total ?? 0;

  return (
    <GlassCard sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          <IconBox color="var(--mui-palette-success-main)" size={40}>
            <VpnKeyIcon sx={{ fontSize: 22 }} />
          </IconBox>
          <Typography variant="subtitle1" fontWeight={600}>
            Vault Summary
          </Typography>
        </Stack>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={4}>
            <Typography variant="caption" color="text.secondary">
              Groups
            </Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {groupCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="caption" color="text.secondary">
              Variables
            </Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {variableCount}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Typography variant="caption" color="text.secondary">
              Secret Files
            </Typography>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {secretFileCount}
            </Typography>
          </Grid>
        </Grid>
        <Button
          component={Link}
          href={ROUTES.projectVault(projectId) as Route}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Go to Vault
        </Button>
      </CardContent>
    </GlassCard>
  );
}
