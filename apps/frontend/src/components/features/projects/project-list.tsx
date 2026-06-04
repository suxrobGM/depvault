"use client";

import { useState, type ReactElement } from "react";
import {
  CalendarToday as CalendarIcon,
  FolderOpen as FolderOpenIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { CardContent, Grid, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import type { Route } from "next";
import Link from "next/link";
import { client } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { ProjectListResponseDto } from "@/api/types/project";
import { Surface } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/feedback";
import { PAGINATION_DEFAULTS, ROUTES } from "@/lib/constants";
import { CreateProjectDialog } from "./create-project-dialog";

export function ProjectList(): ReactElement {
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useApiQuery<ProjectListResponseDto>(queryKeys.projects.list(), () =>
    client.api.projects.get({ query: { page: 1, limit: PAGINATION_DEFAULTS.limit } }),
  );

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!data?.items.length) {
    return (
      <>
        <EmptyState
          icon={<FolderOpenIcon />}
          title="No projects yet"
          description="Create your first project to analyze dependencies, manage secrets, and store encrypted files."
          actionLabel="Create Project"
          onAction={() => setCreateOpen(true)}
        />
        <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </>
    );
  }

  return (
    <Grid container spacing={3}>
      {data.items.map((project, index) => (
        <Grid key={project.id} size={{ xs: 12, sm: 6, md: 4 }}>
          <Link
            href={ROUTES.project(project.id) as Route}
            style={{ textDecoration: "none", display: "block", height: "100%" }}
          >
            <Surface
              accent="primary"
              interactive
              className={`vault-fade-up vault-delay-${index + 1}`}
              sx={{ height: "100%" }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography variant="h6" noWrap sx={{ fontWeight: 600, flex: 1 }}>
                    {project.name}
                  </Typography>
                  {project.repositoryUrl && (
                    <Tooltip title="Open repository">
                      <IconButton
                        size="small"
                        aria-label="Open repository"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(project.repositoryUrl!, "_blank", "noopener,noreferrer");
                        }}
                        sx={{ ml: 1 }}
                      >
                        {project.repositoryUrl.includes("github.com") ? (
                          <GitHubIcon fontSize="small" />
                        ) : (
                          <OpenInNewIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                <Typography
                  variant="body2Muted"
                  sx={{
                    mt: 1,
                    mb: 2,
                    minHeight: 40,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {project.description ?? "No description"}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <CalendarIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="captionMuted">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </Typography>
                </Stack>
              </CardContent>
            </Surface>
          </Link>
        </Grid>
      ))}
    </Grid>
  );
}
