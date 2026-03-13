"use client";

import type { ReactElement, ReactNode } from "react";
import { Box } from "@mui/material";
import { PageHeader } from "@/components/ui/containers";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { ProjectResponse } from "@/types/api/project";
import { VaultTabs } from "./vault-tabs";

interface VaultLayoutShellProps {
  projectId: string;
  children: ReactNode;
}

export function VaultLayoutShell(props: VaultLayoutShellProps): ReactElement {
  const { projectId, children } = props;

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  return (
    <Box>
      <PageHeader
        title="Vault"
        subtitle={project ? `Secure storage for ${project.name}` : undefined}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Projects", href: ROUTES.projects },
          { label: project?.name ?? "...", href: ROUTES.project(projectId) },
          { label: "Vault" },
        ]}
      />
      <VaultTabs projectId={projectId} />
      {children}
    </Box>
  );
}
