import type { ReactElement } from "react";
import {
  CalendarToday as CalendarIcon,
  ChevronRight as ChevronIcon,
  FolderOpen as FolderOpenIcon,
} from "@mui/icons-material";
import { Box, Button, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/feedback";
import { ROUTES } from "@/lib/constants";
import type { Project } from "@/types/api/project";
import { DashboardOnboarding } from "./dashboard-onboarding";

interface DashboardRecentProjectsProps {
  projects: Project[];
}

export function DashboardRecentProjects(props: DashboardRecentProjectsProps): ReactElement {
  const { projects } = props;
  const hasProjects = projects.length > 0;

  return (
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
          {hasProjects && (
            <Button
              component={Link}
              href={ROUTES.projects as Route}
              endIcon={<ChevronIcon />}
              size="small"
            >
              View all
            </Button>
          )}
        </Stack>

        {hasProjects ? (
          <Stack spacing={2}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={ROUTES.project(project.id) as Route}
                style={{ textDecoration: "none", display: "block" }}
              >
                <GlassCard
                  glowColor="var(--mui-palette-primary-main)"
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "translateY(-2px)" },
                  }}
                >
                  <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {project.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        mb: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {project.description ?? "No description"}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CalendarIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </CardContent>
                </GlassCard>
              </Link>
            ))}
          </Stack>
        ) : (
          <EmptyState
            icon={<FolderOpenIcon />}
            title="No projects yet"
            description="Create your first project to analyze dependencies, manage secrets, and store encrypted files."
            actionLabel="Create Project"
            actionHref={ROUTES.projects as Route}
          />
        )}
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Box className="vault-fade-up vault-delay-8">
          <DashboardOnboarding />
        </Box>
      </Grid>
    </Grid>
  );
}
