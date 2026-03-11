"use client";

import type { ReactElement, ReactNode } from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { PageHeader } from "@/components/ui/page-header";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { ProjectResponse } from "@/types/api/project";
import { ProjectTabs } from "./project-tabs";

interface ProjectLayoutShellProps {
  projectId: string;
  children: ReactNode;
}

export function ProjectLayoutShell(props: ProjectLayoutShellProps): ReactElement {
  const { projectId, children } = props;

  const { data: project, isLoading } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={300} />
      </Box>
    );
  }

  if (!project) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: "40vh" }}>
        <Typography variant="h5" color="text.secondary">
          Project not found
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <PageHeader
        title={project.name}
        subtitle={project.description || undefined}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Projects", href: ROUTES.projects },
          { label: project.name },
        ]}
      />
      <ProjectTabs projectId={projectId} />
      {children}
    </Box>
  );
}
