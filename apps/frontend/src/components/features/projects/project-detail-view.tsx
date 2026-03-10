"use client";

import type { ReactElement } from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { PageHeader } from "@/components/ui/page-header";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { ProjectTabPanel } from "./project-tab-panel";
import { ProjectTabs } from "./project-tabs";

type ProjectTab = "overview" | "members" | "settings";

interface ProjectDetailViewProps {
  projectId: string;
  activeTab: ProjectTab;
}

export function ProjectDetailView(props: ProjectDetailViewProps): ReactElement {
  const { projectId, activeTab } = props;
  const { user } = useAuth();

  const { data: project, isLoading } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const isOwner = currentMember?.role === "OWNER";
  const isEditor = currentMember?.role === "EDITOR";
  const canEdit = isOwner || isEditor;

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
      <ProjectTabs activeTab={activeTab} projectId={projectId} />
      <ProjectTabPanel
        activeTab={activeTab}
        project={project}
        projectId={projectId}
        isOwner={isOwner}
        canEdit={canEdit}
        memberCount={membersData?.pagination.total ?? 0}
      />
    </Box>
  );
}
