"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import type { VaultGroupListResponse } from "@/types/api/vault-group";
import { CreateGroupDialog } from "./create-group-dialog";
import { VaultGroupList } from "./vault-group-list";

interface VaultPageViewProps {
  projectId: string;
}

export function VaultPageView(props: VaultPageViewProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();

  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useApiQuery<ProjectResponse>(
    ["projects", projectId],
    () => client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: groups, isLoading: groupsLoading } = useApiQuery<VaultGroupListResponse>(
    ["vault-groups", projectId],
    () => client.api.projects({ id: projectId })["vault-groups"].get(),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const isOwner = currentMember?.role === "OWNER";
  const isEditor = currentMember?.role === "EDITOR";
  const canEdit = isOwner || isEditor;

  if (projectLoading || groupsLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
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
        title="Vault"
        subtitle={`Manage environment variables for ${project.name}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Projects", href: ROUTES.projects },
          { label: project.name, href: ROUTES.project(projectId) },
          { label: "Vault" },
        ]}
        actions={
          canEdit ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateGroupOpen(true)}
            >
              Add Group
            </Button>
          ) : undefined
        }
      />

      {!groups || groups.length === 0 ? (
        <EmptyState
          icon={<VpnKeyIcon />}
          title="No vault groups yet"
          description="Create a vault group to start organizing your environment variables by service, sub-project, or config file."
          actionLabel={canEdit ? "Create Group" : undefined}
          onAction={canEdit ? () => setCreateGroupOpen(true) : undefined}
        />
      ) : (
        <VaultGroupList projectId={projectId} groups={groups} canEdit={canEdit} />
      )}

      {canEdit && (
        <CreateGroupDialog
          open={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          projectId={projectId}
        />
      )}
    </Box>
  );
}
