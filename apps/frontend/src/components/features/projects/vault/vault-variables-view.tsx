"use client";

import { useState, type ReactElement } from "react";
import {
  Add as AddIcon,
  BookmarkBorder as BookmarkBorderIcon,
  VpnKey as VpnKeyIcon,
} from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import type { MemberListResponse } from "@/types/api/project";
import type { VaultGroup, VaultGroupListResponse } from "@/types/api/vault-group";
import { CreateGroupDialog } from "./create-group-dialog";
import { PendingKeyGrantsBanner } from "./pending-key-grants-banner";
import { ProjectTemplatesSection } from "./templates/project-templates-section";
import { VaultGroupList } from "./vault-group-list";

interface VaultVariablesViewProps {
  projectId: string;
}

export function VaultVariablesView(props: VaultVariablesViewProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: groups } = useApiQuery<VaultGroupListResponse>(["vault-groups", projectId], () =>
    client.api.projects({ id: projectId })["vault-groups"].get(),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  const vaultGroups: VaultGroup[] = groups ?? [];

  return (
    <>
      <PendingKeyGrantsBanner projectId={projectId} canEdit={canEdit} />

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
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
  );
}
