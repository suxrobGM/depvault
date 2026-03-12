"use client";

import type { ReactElement } from "react";
import {
  CalendarToday as CalendarIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import { Button, CardContent, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { ProjectResponse } from "@/types/api/project";

interface AboutCardProps {
  projectId: string;
}

export function AboutCard(props: AboutCardProps): ReactElement {
  const { projectId } = props;

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  if (!project) {
    return <GlassCard sx={{ height: "100%" }} />;
  }

  return (
    <GlassCard sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          About
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {project.description || "No description provided."}
        </Typography>
        {project.repositoryUrl && (
          <Button
            component="a"
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
            startIcon={
              project.repositoryUrl.includes("github.com") ? <GitHubIcon /> : <OpenInNewIcon />
            }
          >
            View Repository
          </Button>
        )}
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <UpdateIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Updated {new Date(project.updatedAt).toLocaleDateString()}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </GlassCard>
  );
}
