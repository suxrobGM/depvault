"use client";

import type { ReactElement, ReactNode } from "react";
import {
  BugReport as BugIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Inventory as InventoryIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import { CardContent, Grid, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";

interface StatCard {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}

const stats: StatCard[] = [
  { icon: <FolderIcon />, label: "Projects", value: 0, color: "var(--mui-palette-primary-main)" },
  {
    icon: <InventoryIcon />,
    label: "Dependencies",
    value: 0,
    color: "var(--mui-palette-info-light)",
  },
  { icon: <BugIcon />, label: "Vulnerabilities", value: 0, color: "var(--mui-palette-error-main)" },
  {
    icon: <SecretIcon />,
    label: "Env Variables",
    value: 0,
    color: "var(--mui-palette-secondary-main)",
  },
  { icon: <FileIcon />, label: "Secret Files", value: 0, color: "#a78bfa" },
];

export function DashboardStats(): ReactElement {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat, i) => (
        <Grid key={stat.label} size={{ xs: 6, sm: 4, md: "grow" }}>
          <GlassCard glowColor={stat.color} sx={{ height: "100%" }}>
            <CardContent
              className={`vault-fade-up vault-delay-${i + 1}`}
              sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}
            >
              <IconBox color={stat.color} size={40} sx={{ mb: 1.5 }}>
                {stat.icon}
              </IconBox>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 0.25 }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </CardContent>
          </GlassCard>
        </Grid>
      ))}
    </Grid>
  );
}
