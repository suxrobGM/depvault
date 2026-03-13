"use client";

import { useState, type ReactElement } from "react";
import { getEnvironmentLabel, type EnvironmentTypeValue } from "@depvault/shared/constants";
import { VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { CreateShareLinkDialog } from "@/components/features/shared-secret/create-share-link-dialog";
import { EmptyState } from "@/components/ui/feedback";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { EnvVariable, EnvVariableListResponse } from "@/types/api/env-variable";
import type { EnvironmentListResponse } from "@/types/api/environment";
import type { VaultGroup } from "@/types/api/vault-group";
import { CloneEnvironmentDialog } from "./clone-environment-dialog";
import { CreateVariableDialog } from "./create-variable-dialog";
import { EnvDiffView } from "./diff/env-diff-view";
import { DownloadBundleDialog } from "./download-bundle-dialog";
import { EditGroupDialog } from "./edit-group-dialog";
import { EditVariableDialog } from "./edit-variable-dialog";
import { EnvironmentSelector } from "./environment-selector";
import { ExportVariablesDialog } from "./export-variables-dialog";
import { ImportVariablesDialog } from "./import-variables-dialog";
import { VaultToolbar } from "./vault-toolbar";
import { VaultVariableTable } from "./vault-variable-table";

type VaultView = "variables" | "diff";

interface VaultGroupCardProps {
  projectId: string;
  group: VaultGroup;
  canEdit: boolean;
}

export function VaultGroupCard(props: VaultGroupCardProps): ReactElement {
  const { projectId, group, canEdit } = props;
  const confirm = useConfirm();

  const [view, setView] = useState<VaultView>("variables");
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnvVariable | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);

  const { data: environments } = useApiQuery<EnvironmentListResponse>(
    ["environments", projectId, group.id],
    () =>
      client.api
        .projects({ id: projectId })
        .environments.get({ query: { vaultGroupId: group.id } }),
  );

  const activeEnv = selectedEnv ?? environments?.[0]?.type ?? null;

  const { data: variablesData, isLoading: variablesLoading } = useApiQuery<EnvVariableListResponse>(
    ["env-variables", projectId, group.id, activeEnv],
    () =>
      client.api.projects({ id: projectId }).environments.variables.get({
        query: {
          vaultGroupId: group.id,
          environmentType: activeEnv as EnvironmentTypeValue,
          page: 1,
          limit: 100,
        },
      }),
    { enabled: !!activeEnv && view === "variables" },
  );

  const deleteMutation = useApiMutation(
    () => client.api.projects({ id: projectId })["vault-groups"]({ groupId: group.id }).delete(),
    {
      invalidateKeys: [["vault-groups", projectId]],
      successMessage: "Group deleted",
    },
  );

  const deleteEnvMutation = useApiMutation(
    (envId: string) => client.api.projects({ id: projectId }).environments({ envId }).delete(),
    {
      invalidateKeys: [
        ["environments", projectId, group.id],
        ["env-variables", projectId],
        ["vault-groups", projectId],
      ],
      successMessage: "Environment deleted",
      onSuccess: () => setSelectedEnv(null),
    },
  );

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete vault group",
      description: `This will permanently delete the group "${group.name}" and all its environments and variables.`,
      confirmLabel: "Delete",
      destructive: true,
      confirmationText: group.name,
    });
    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  const handleDeleteEnvironment = async (envId: string, envType: string) => {
    const env = environments?.find((e) => e.id === envId);
    const varCount = env?.variableCount ?? 0;
    const fileCount = env?.secretFileCount ?? 0;
    const parts: string[] = [];

    if (varCount > 0) {
      parts.push(`${varCount} variable${varCount !== 1 ? "s" : ""}`);
    }
    if (fileCount > 0) {
      parts.push(`${fileCount} secret file${fileCount !== 1 ? "s" : ""}`);
    }

    const description =
      parts.length > 0
        ? `This will permanently delete the "${getEnvironmentLabel(envType)}" environment and its ${parts.join(" and ")}.`
        : `This will permanently delete the "${getEnvironmentLabel(envType)}" environment.`;

    const confirmed = await confirm({
      title: "Delete environment",
      description,
      confirmLabel: "Delete",
      destructive: true,
      confirmationText: getEnvironmentLabel(envType),
    });

    if (confirmed) {
      deleteEnvMutation.mutate(envId);
    }
  };

  if (view === "diff" && environments) {
    return (
      <EnvDiffView
        projectId={projectId}
        vaultGroupId={group.id}
        environments={environments}
        onBack={() => setView("variables")}
      />
    );
  }

  if (!environments || environments.length === 0) {
    return (
      <Box>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <VaultToolbar
            canEdit={canEdit}
            onImport={() => setImportOpen(true)}
            onEditGroup={() => setEditGroupOpen(true)}
            onDeleteGroup={handleDelete}
          />
        </Stack>
        <EmptyState
          icon={<VpnKeyIcon />}
          title="No environments yet"
          description="Import variables from a .env file or create your first environment variable to get started."
          actionLabel={canEdit ? "Import Variables" : undefined}
          onAction={canEdit ? () => setImportOpen(true) : undefined}
        />
        {canEdit && (
          <>
            <ImportVariablesDialog
              open={importOpen}
              onClose={() => setImportOpen(false)}
              projectId={projectId}
              vaultGroupId={group.id}
            />
            <EditGroupDialog
              open={editGroupOpen}
              onClose={() => setEditGroupOpen(false)}
              projectId={projectId}
              group={group}
            />
          </>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          rowGap={2}
        >
          <EnvironmentSelector
            environments={environments}
            selected={activeEnv}
            onSelect={setSelectedEnv}
            onDelete={canEdit ? handleDeleteEnvironment : undefined}
          />
          <VaultToolbar
            canEdit={canEdit}
            hasEnvironment={!!activeEnv}
            hasVariables={(variablesData?.items.length ?? 0) > 0}
            onCreateVariable={() => setCreateOpen(true)}
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
            onCompare={() => setView("diff")}
            onClone={() => setCloneOpen(true)}
            onShare={() => setShareOpen(true)}
            onBundle={() => setBundleOpen(true)}
            onEditGroup={() => setEditGroupOpen(true)}
            onDeleteGroup={handleDelete}
          />
        </Stack>

        {activeEnv && (
          <Typography variant="subtitle1" fontWeight={600}>
            Variables
          </Typography>
        )}

        {activeEnv && (
          <VaultVariableTable
            projectId={projectId}
            environmentType={activeEnv}
            variables={variablesData?.items ?? []}
            isLoading={variablesLoading}
            canEdit={canEdit}
            onEditVariable={setEditTarget}
          />
        )}
      </Stack>

      {canEdit && activeEnv && (
        <>
          <CreateVariableDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            projectId={projectId}
            vaultGroupId={group.id}
            environmentType={activeEnv}
          />
          <EditVariableDialog
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            projectId={projectId}
            environmentType={activeEnv}
            variable={editTarget}
          />
          <ImportVariablesDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            projectId={projectId}
            vaultGroupId={group.id}
            environmentType={activeEnv}
          />
          <CloneEnvironmentDialog
            open={cloneOpen}
            onClose={() => setCloneOpen(false)}
            projectId={projectId}
            vaultGroupId={group.id}
            sourceType={activeEnv}
            onSuccess={setSelectedEnv}
          />
        </>
      )}

      {canEdit && activeEnv && variablesData && variablesData.items.length > 0 && (
        <CreateShareLinkDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={projectId}
          variables={variablesData.items}
        />
      )}

      {canEdit && activeEnv && (
        <DownloadBundleDialog
          open={bundleOpen}
          onClose={() => setBundleOpen(false)}
          projectId={projectId}
          vaultGroupId={group.id}
          environmentType={activeEnv as EnvironmentTypeValue}
          variables={variablesData?.items ?? []}
        />
      )}

      {activeEnv && (
        <ExportVariablesDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          projectId={projectId}
          vaultGroupId={group.id}
          environmentType={activeEnv as EnvironmentTypeValue}
        />
      )}

      {canEdit && (
        <EditGroupDialog
          open={editGroupOpen}
          onClose={() => setEditGroupOpen(false)}
          projectId={projectId}
          group={group}
        />
      )}
    </Box>
  );
}
