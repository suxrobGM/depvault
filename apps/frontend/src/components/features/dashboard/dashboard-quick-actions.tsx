import type { ReactElement } from "react";
import {
  Add as AddIcon,
  ChevronRight as ChevronIcon,
  Search as SearchIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { CardContent, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { GlassCard, IconBox } from "@/components/ui/cards";
import { ROUTES } from "@/lib/constants";

const quickActions = [
  {
    icon: <AddIcon sx={{ fontSize: 28 }} />,
    title: "Create Project",
    description: "Set up a project to organize dependencies, secrets, and secure files",
    color: "var(--mui-palette-primary-main)",
    href: ROUTES.projects,
  },
  {
    icon: <SearchIcon sx={{ fontSize: 28 }} />,
    title: "Analyze Dependencies",
    description:
      "Open a project to scan dependencies for vulnerabilities, outdated packages, and license issues",
    color: "var(--mui-palette-secondary-main)",
    href: ROUTES.projects,
  },
  {
    icon: <VpnKeyIcon sx={{ fontSize: 28 }} />,
    title: "Manage Vault",
    description:
      "Select a project to manage its encrypted vault, secret files, and environment variables",
    color: "var(--mui-palette-info-dark)",
    href: ROUTES.projects,
  },
];

export function DashboardQuickActions(): ReactElement {
  return (
    <>
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
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <IconBox color={action.color} size={56}>
                      {action.icon}
                    </IconBox>
                    <ChevronIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      mt: 2,
                    }}
                  >
                    {action.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {action.description}
                  </Typography>
                </CardContent>
              </GlassCard>
            </Link>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
