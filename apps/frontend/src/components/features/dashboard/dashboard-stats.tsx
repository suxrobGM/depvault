"use client";

import type { ReactElement, ReactNode } from "react";
import {
  BugReport as BugIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Inventory as InventoryIcon,
  VpnKey as SecretIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";

interface StatCard {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}

const stats: StatCard[] = [
  { icon: <FolderIcon />, label: "Projects", value: 0, color: "#10b981" },
  { icon: <InventoryIcon />, label: "Dependencies", value: 0, color: "#22d3ee" },
  { icon: <BugIcon />, label: "Vulnerabilities", value: 0, color: "#f87171" },
  { icon: <SecretIcon />, label: "Env Variables", value: 0, color: "#f59e0b" },
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
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: `${stat.color}1a`,
                  color: stat.color,
                  mb: 1.5,
                }}
              >
                {stat.icon}
              </Box>
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
