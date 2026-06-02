"use client";

import { type ReactElement } from "react";
import { Box } from "@mui/material";
import { VaultGate } from "@/components/features/vault";
import { PageHeader } from "@/components/ui/containers";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { ProjectDetailDto } from "@/types/api/project";
import { RepoBrowser } from "./repo-browser";

interface RepoPageShellProps {
  projectId: string;
}

/** Repository browser page: header + vault unlock gate + the app/file browser. */
export function RepoPageShell(props: RepoPageShellProps): ReactElement {
  const { projectId } = props;

  const { data: project } = useApiQuery<ProjectDetailDto>(
    queryKeys.projects.detail(projectId),
    () => client.api.projects({ id: projectId }).get(),
  );

  return (
    <Box>
      <PageHeader
        title="Vault"
        subtitle={project ? `Encrypted config & secret files for ${project.name}` : undefined}
        breadcrumbs={[
          { label: "Overview", href: ROUTES.overview },
          { label: "Projects", href: ROUTES.projects },
          { label: project?.name ?? "...", href: ROUTES.project(projectId) },
          { label: "Vault" },
        ]}
      />
      <VaultGate>
        <RepoBrowser projectId={projectId} />
      </VaultGate>
    </Box>
  );
}
