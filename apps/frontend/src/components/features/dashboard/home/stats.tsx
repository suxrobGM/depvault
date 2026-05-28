"use client";

import type { ReactElement, ReactNode } from "react";
import {
  BugReport as BugIcon,
  Folder as FolderIcon,
  Inventory as InventoryIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { IconBox, Surface, type SurfaceAccent } from "@/components/ui/cards";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { ProjectStatsResponse } from "@/types/api/project";

interface StatCard {
  icon: ReactNode;
  label: string;
  value: number;
  accent: SurfaceAccent;
}

export function Stats(): ReactElement {
  const { data, isLoading } = useApiQuery<ProjectStatsResponse>(["project-stats"], () =>
    client.api.projects.stats.get(),
  );

  const stats: StatCard[] = [
    {
      icon: <FolderIcon sx={{ fontSize: 22 }} />,
      label: "Projects",
      value: data?.projectCount ?? 0,
      accent: "primary",
    },
    {
      icon: <InventoryIcon sx={{ fontSize: 22 }} />,
      label: "Dependencies",
      value: data?.dependencyCount ?? 0,
      accent: "primary",
    },
    {
      icon: <BugIcon sx={{ fontSize: 22 }} />,
      label: "Vulnerabilities",
      value: data?.vulnerabilityCount ?? 0,
      accent: "error",
    },
    {
      icon: <SecretIcon sx={{ fontSize: 22 }} />,
      label: "Env Variables",
      value: data?.envVariableCount ?? 0,
      accent: "primary",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat, i) => (
        <Grid key={stat.label} size={{ xs: 6, sm: 4, md: "grow" }}>
          <Surface accent={stat.accent} sx={{ height: "100%" }}>
            <CardContent
              className={`vault-fade-up vault-delay-${i + 1}`}
              sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <IconBox color={`var(--mui-palette-${stat.accent}-main)`} size={44}>
                  {stat.icon}
                </IconBox>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={36} />
                  ) : (
                    <Typography variant="statValue">{stat.value}</Typography>
                  )}
                  <Typography variant="body2Muted">{stat.label}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Surface>
        </Grid>
      ))}
    </Grid>
  );
}
