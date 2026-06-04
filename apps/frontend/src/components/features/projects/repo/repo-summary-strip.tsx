"use client";

import { type ReactElement } from "react";
import {
  Schedule as ClockIcon,
  Description as ConfigIcon,
  Layers as EnvIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import { Box, CardContent, Divider, Stack, Typography } from "@mui/material";
import type { RepoMapAppDto } from "@/api/types/repo";
import { Surface } from "@/components/ui/cards";
import { formatRelativeTime } from "@/utils/formatters";

interface RepoSummaryStripProps {
  apps: RepoMapAppDto[];
}

interface Stat {
  icon: ReactElement;
  label: string;
  value: string;
}

/** A compact stats strip above the repo browser: files, secrets, environments, last update. */
export function RepoSummaryStrip(props: RepoSummaryStripProps): ReactElement {
  const { apps } = props;

  const files = apps.flatMap((app) => app.files);
  const secretCount = files.filter((f) => f.kind === "SECRET").length;
  const environments = new Set<string>();
  for (const app of apps) {
    for (const env of app.environments) environments.add(env);
  }

  const latest = files.reduce<Date | null>((acc, file) => {
    const updated = new Date(file.updatedAt);
    return !acc || updated > acc ? updated : acc;
  }, null);

  const stats: Stat[] = [
    { icon: <ConfigIcon fontSize="small" />, label: "Files", value: String(files.length) },
    { icon: <SecretIcon fontSize="small" />, label: "Secrets", value: String(secretCount) },
    {
      icon: <EnvIcon fontSize="small" />,
      label: "Environments",
      value: String(environments.size),
    },
    {
      icon: <ClockIcon fontSize="small" />,
      label: "Last updated",
      value: latest ? formatRelativeTime(latest) : "—",
    },
  ];

  return (
    <Surface>
      <CardContent>
        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem />}
          spacing={3}
          sx={{ flexWrap: "wrap", rowGap: 2 }}
        >
          {stats.map((stat) => (
            <Stack key={stat.label} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box sx={{ color: "primary.main", display: "flex" }}>{stat.icon}</Box>
              <Box>
                <Typography variant="statValue" sx={{ fontSize: "1.1rem", display: "block" }}>
                  {stat.value}
                </Typography>
                <Typography variant="captionMuted">{stat.label}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Surface>
  );
}
