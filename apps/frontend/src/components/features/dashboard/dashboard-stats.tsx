"use client";

import type { ReactElement, ReactNode } from "react";
import {
  BugReport as BugIcon,
  Folder as FolderIcon,
  Inventory as InventoryIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Skeleton, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { ProjectStatsResponse } from "@/types/api/project";

interface StatCard {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}

export function DashboardStats(): ReactElement {
  const { data, isLoading } = useApiQuery<ProjectStatsResponse>(["project-stats"], () =>
    client.api.projects.stats.get(),
  );

  const stats: StatCard[] = [
    {
      icon: <FolderIcon sx={{ fontSize: 22 }} />,
      label: "Projects",
      value: data?.projectCount ?? 0,
      color: "var(--mui-palette-primary-main)",
    },
    {
      icon: <InventoryIcon sx={{ fontSize: 22 }} />,
      label: "Dependencies",
      value: data?.dependencyCount ?? 0,
      color: "var(--mui-palette-info-light)",
    },
    {
      icon: <BugIcon sx={{ fontSize: 22 }} />,
      label: "Vulnerabilities",
      value: data?.vulnerabilityCount ?? 0,
      color: "var(--mui-palette-error-main)",
    },
    {
      icon: <SecretIcon sx={{ fontSize: 22 }} />,
      label: "Env Variables",
      value: data?.envVariableCount ?? 0,
      color: "var(--mui-palette-secondary-main)",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat, i) => (
        <Grid key={stat.label} size={{ xs: 6, sm: 4, md: "grow" }}>
          <GlassCard glowColor={stat.color} sx={{ height: "100%" }}>
            <CardContent
              className={`vault-fade-up vault-delay-${i + 1}`}
              sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                }}
              >
                <IconBox color={stat.color} size={44}>
                  {stat.icon}
                </IconBox>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={36} />
                  ) : (
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {stat.value}
                    </Typography>
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </GlassCard>
        </Grid>
      ))}
    </Grid>
  );
}
