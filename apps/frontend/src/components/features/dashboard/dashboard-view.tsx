import type { ReactElement } from "react";
import {
  Add as AddIcon,
  ChevronRight as ChevronIcon,
  FolderOpen as FolderOpenIcon,
  Search as SearchIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";
import { ROUTES } from "@/lib/constants";
import { DashboardGreeting } from "./dashboard-greeting";
import { DashboardOnboarding } from "./dashboard-onboarding";
import { DashboardStats } from "./dashboard-stats";

const quickActions = [
  {
    icon: <AddIcon />,
    title: "Create Project",
    description: "Set up a project to organize dependencies, secrets, and secure files",
    color: "var(--mui-palette-primary-main)",
    href: ROUTES.projects,
  },
  {
    icon: <SearchIcon />,
    title: "Analyze Dependencies",
    description: "Upload a dependency file to scan for vulnerabilities and license issues",
    color: "var(--mui-palette-secondary-main)",
    href: ROUTES.converter,
  },
  {
    icon: <VpnKeyIcon />,
    title: "Manage Vault",
    description: "Store environment variables and secret files with AES-256-GCM encryption",
    color: "var(--mui-palette-info-dark)",
    href: ROUTES.secrets,
  },
];

export function DashboardView(): ReactElement {
  return (
    <Box>
      <DashboardGreeting />
      <DashboardStats />

      <Typography variant="h6" sx={{ mb: 2 }} className="vault-fade-up vault-delay-5">
        Quick Actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid key={action.title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Link
              href={action.href as Route}
              style={{ textDecoration: "none", display: "block", height: "100%" }}
            >
              <GlassCard
                glowColor={action.color}
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <CardContent className={`vault-fade-up vault-delay-${index + 5}`} sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <IconBox color={action.color} size={56}>
                      {action.icon}
                    </IconBox>
                    <ChevronIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2 }} gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </GlassCard>
            </Link>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack
            className="vault-fade-up vault-delay-8"
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">Recent Projects</Typography>
          </Stack>
          <EmptyState
            icon={<FolderOpenIcon />}
            title="No projects yet"
            description="Create your first project to analyze dependencies, manage secrets, and store encrypted files."
            actionLabel="Create Project"
            actionHref={ROUTES.projects as Route}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box className="vault-fade-up vault-delay-8">
            <DashboardOnboarding />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
