import type { ReactElement } from "react";
import {
  Add as AddIcon,
  FolderOpen as FolderOpenIcon,
  Search as SearchIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassCard } from "@/components/ui/glass-card";
import { ROUTES } from "@/lib/constants";
import { DashboardGreeting } from "./dashboard-greeting";

const quickActions = [
  {
    icon: <AddIcon />,
    title: "Create Project",
    description: "Start a new project to track dependencies and secrets",
    color: "#10b981",
    href: ROUTES.dashboard,
  },
  {
    icon: <SearchIcon />,
    title: "Analyze Dependencies",
    description: "Upload a dependency file to scan for vulnerabilities",
    color: "#f59e0b",
    href: ROUTES.dashboard,
  },
  {
    icon: <VpnKeyIcon />,
    title: "Manage Secrets",
    description: "Store and share environment variables securely",
    color: "#06b6d4",
    href: ROUTES.dashboard,
  },
];

export function DashboardView(): ReactElement {
  return (
    <Box>
      <DashboardGreeting />

      <Typography variant="h6" sx={{ mb: 2 }} className="vault-fade-up vault-delay-1">
        Quick Actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid key={action.title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Link
              href={action.href}
              style={{ textDecoration: "none", display: "block", height: "100%" }}
            >
              <GlassCard glowColor={action.color} sx={{ height: "100%", cursor: "pointer" }}>
                <CardContent className={`vault-fade-up vault-delay-${index + 1}`} sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: `${action.color}1a`,
                      color: action.color,
                      mb: 2,
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
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

      <Stack
        className="vault-fade-up vault-delay-4"
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
        description="Create your first project to start analyzing dependencies and managing secrets."
        actionLabel="Create Project"
        actionHref={ROUTES.dashboard}
      />
    </Box>
  );
}
