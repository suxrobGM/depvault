"use client";

import type { ReactElement } from "react";
import { ArrowForward as ArrowForwardIcon, FolderZip as FilesIcon } from "@mui/icons-material";
import { CardActions, CardContent, CardHeader, Grid, Stack, Typography } from "@mui/material";
import { IconBox, Surface } from "@/components/ui/cards";
import { LinkButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { RepoMapResponseDto } from "@/types/api/repo";

interface FilesCardProps {
  projectId: string;
}

export function FilesCard(props: FilesCardProps): ReactElement {
  const { projectId } = props;

  const { data: repoMap } = useApiQuery<RepoMapResponseDto>(queryKeys.repo.map(projectId), () =>
    client.api.projects({ id: projectId })["repo-map"].get(),
  );

  const apps = repoMap?.apps ?? [];
  const files = apps.flatMap((app) => app.files);
  const appCount = apps.length;
  const fileCount = files.length;
  const configCount = files.filter((f) => f.kind === "CONFIG").length;
  const secretCount = files.filter((f) => f.kind === "SECRET").length;
  const environmentCount = new Set(apps.flatMap((app) => app.environments)).size;

  const stats = [
    { label: "Apps", value: appCount },
    { label: "Files", value: fileCount },
    { label: "Environments", value: environmentCount },
  ];

  return (
    <Surface accent="success" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <IconBox color="var(--mui-palette-success-main)" size={40}>
            <FilesIcon sx={{ fontSize: 22 }} />
          </IconBox>
        }
        title="Files"
        subheader={`${configCount} config · ${secretCount} secret`}
      />
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {stats.map((stat) => (
            <Grid size={4} key={stat.label}>
              <Stack spacing={0.25}>
                <Typography variant="captionMuted">{stat.label}</Typography>
                <Typography variant="statValue" sx={{ fontSize: "1rem" }}>
                  {stat.value}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </CardContent>
      <CardActions>
        <LinkButton
          href={ROUTES.projectVault(projectId)}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon />}
        >
          Open Vault
        </LinkButton>
      </CardActions>
    </Surface>
  );
}
