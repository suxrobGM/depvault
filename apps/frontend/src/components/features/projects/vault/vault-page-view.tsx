"use client";

import { useState, type ReactElement } from "react";
import {
  Add as AddIcon,
  BookmarkBorder as BookmarkBorderIcon,
  FolderOpen as FilesIcon,
  Upload as UploadIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { Box, Button, Skeleton, Stack, Tab, Tabs, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import type { VaultGroup, VaultGroupListResponse } from "@/types/api/vault-group";
import { SecretFilesTab } from "../secrets/secret-files-tab";
import { CreateGroupDialog } from "./create-group-dialog";
import { ProjectTemplatesSection } from "./templates/project-templates-section";
import { VaultGroupList } from "./vault-group-list";

interface VaultPageViewProps {
  projectId: string;
}

export function VaultPageView(props: VaultPageViewProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

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

  const vaultGroups: VaultGroup[] = groups ?? [];

  if (projectLoading || groupsLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={48} sx={{ mb: 3 }} />
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

  const headerActions =
    activeTab === 0 ? (
      <Stack direction="row" spacing={1}>
        <Button
          variant={showTemplates ? "contained" : "outlined"}
          startIcon={<BookmarkBorderIcon />}
          onClick={() => setShowTemplates((v) => !v)}
        >
          Templates
        </Button>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateGroupOpen(true)}
          >
            Add Group
          </Button>
        )}
      </Stack>
    ) : canEdit ? (
      <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
        Upload File
      </Button>
    ) : undefined;

  return (
    <Box>
      <PageHeader
        title="Vault"
        subtitle={`Secure storage for ${project.name}`}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Projects", href: ROUTES.projects },
          { label: project.name, href: ROUTES.project(projectId) },
          { label: "Vault" },
        ]}
        actions={headerActions}
      />

      <Tabs
        value={activeTab}
        onChange={(_, v: number) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab icon={<VpnKeyIcon />} iconPosition="start" label="Variables" />
        <Tab icon={<FilesIcon />} iconPosition="start" label="Secret Files" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {showTemplates && (
            <ProjectTemplatesSection
              projectId={projectId}
              canEdit={canEdit}
              vaultGroups={vaultGroups}
            />
          )}

          {vaultGroups.length === 0 ? (
            <EmptyState
              icon={<VpnKeyIcon />}
              title="No vault groups yet"
              description="Create a vault group to start organizing your environment variables by service, sub-project, or config file."
              actionLabel={canEdit ? "Create Group" : undefined}
              onAction={canEdit ? () => setCreateGroupOpen(true) : undefined}
            />
          ) : (
            <VaultGroupList projectId={projectId} groups={vaultGroups} canEdit={canEdit} />
          )}

          {canEdit && (
            <CreateGroupDialog
              open={createGroupOpen}
              onClose={() => setCreateGroupOpen(false)}
              projectId={projectId}
            />
          )}
        </>
      )}

      {activeTab === 1 && (
        <SecretFilesTab
          projectId={projectId}
          canEdit={canEdit}
          vaultGroups={vaultGroups}
          uploadOpen={uploadOpen}
          onUploadOpen={() => setUploadOpen(true)}
          onUploadClose={() => setUploadOpen(false)}
        />
      )}
    </Box>
  );
}
