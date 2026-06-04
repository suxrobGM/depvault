"use client";

import type { ReactElement, ReactNode } from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { client } from "@/api/client";
import { useApiQuery } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import type { ProjectDetailDto } from "@/api/types/project";
import { PageHeader } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";
import { ProjectTabs } from "./project-tabs";

interface ProjectLayoutShellProps {
  projectId: string;
  children: ReactNode;
}

export function ProjectLayoutShell(props: ProjectLayoutShellProps): ReactElement {
  const { projectId, children } = props;

  const { data: project, isLoading } = useApiQuery<ProjectDetailDto>(
    queryKeys.projects.detail(projectId),
    () => client.api.projects({ id: projectId }).get(),
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
      <Stack
        sx={{
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "text.secondary",
          }}
        >
          Project not found
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <PageHeader
        title={project.name}
        subtitle={project.description}
        breadcrumbs={[
          { label: "Overview", href: ROUTES.overview },
          { label: "Projects", href: ROUTES.projects },
          { label: project.name },
        ]}
      />
      <ProjectTabs projectId={projectId} currentUserRole={project.currentUserRole} />
      {children}
    </Box>
  );
}
