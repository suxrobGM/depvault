"use client";

import type { ReactElement } from "react";
import {
  CalendarToday as CalendarIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import { Button, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import { client } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { ProjectDetailDto } from "@/api/types/project";
import { Surface } from "@/components/ui/cards";

interface AboutCardProps {
  projectId: string;
}

export function AboutCard(props: AboutCardProps): ReactElement {
  const { projectId } = props;

  const { data: project } = useApiQuery<ProjectDetailDto>(
    queryKeys.projects.detail(projectId),
    () => client.api.projects({ id: projectId }).get(),
  );

  if (!project) {
    return <Surface sx={{ height: "100%" }} />;
  }

  return (
    <Surface sx={{ height: "100%" }}>
      <CardHeader title="About" />
      <CardContent sx={{ p: 3 }}>
        <Typography variant="body2Muted" sx={{ mb: 3 }}>
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
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2Muted">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <UpdateIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2Muted">
              Updated {new Date(project.updatedAt).toLocaleDateString()}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Surface>
  );
}
