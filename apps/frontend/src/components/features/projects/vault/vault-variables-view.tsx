"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { Box, Button, Grid, Stack } from "@mui/material";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import type { EnvVariableListResponse } from "@/types/api/env-variable";
import type { MemberListResponse } from "@/types/api/project";
import type { VaultListResponse } from "@/types/api/vault";
import { CreateVariableDialog } from "./create-variable-dialog";
import { CreateVaultDialog } from "./create-vault-dialog";
import { EditVariableDialog } from "./edit-variable-dialog";
import { PendingKeyGrantsBanner } from "./pending-key-grants-banner";
import { VaultList } from "./vault-list";
import { VaultVariableTable } from "./vault-variable-table";

interface VaultVariablesViewProps {
  projectId: string;
}

export function VaultVariablesView(props: VaultVariablesViewProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();

  const [createVaultOpen, setCreateVaultOpen] = useState(false);
  const [createVariableOpen, setCreateVariableOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<
    EnvVariableListResponse["items"][number] | null
  >(null);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: vaults } = useApiQuery<VaultListResponse>(["vaults", projectId], () =>
    client.api.projects({ id: projectId }).vaults.get(),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  const list = vaults ?? [];
  const activeVaultId = selectedVaultId ?? list[0]?.id ?? null;

  const { data: variablesData, isLoading: variablesLoading } = useApiQuery<EnvVariableListResponse>(
    ["vault-variables", projectId, activeVaultId],
    () =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId: activeVaultId ?? "" })
        .variables.get({ query: { page: 1, limit: 500 } }),
    { enabled: !!activeVaultId },
  );

  const variables = variablesData?.items ?? [];

  return (
    <>
      <PendingKeyGrantsBanner projectId={projectId} canEdit={canEdit ?? false} />

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateVaultOpen(true)}
          >
            New Vault
          </Button>
        )}
        {canEdit && activeVaultId && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateVariableOpen(true)}
          >
            New Variable
          </Button>
        )}
      </Stack>

      {list.length === 0 ? (
        <EmptyState
          icon={<VpnKeyIcon />}
          title="No vaults yet"
          description="Create a vault to store encrypted environment variables and secret files for this project."
          actionLabel={canEdit ? "Create Vault" : undefined}
          onAction={canEdit ? () => setCreateVaultOpen(true) : undefined}
        />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <VaultList
              projectId={projectId}
              vaults={list}
              canEdit={canEdit ?? false}
              selectedVaultId={activeVaultId}
              onSelectVault={setSelectedVaultId}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box>
              {activeVaultId && (
                <VaultVariableTable
                  projectId={projectId}
                  vaultId={activeVaultId}
                  variables={variables}
                  isLoading={variablesLoading}
                  canEdit={canEdit ?? false}
                  onEditVariable={setEditingVariable}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {canEdit && (
        <CreateVaultDialog
          open={createVaultOpen}
          onClose={() => setCreateVaultOpen(false)}
          projectId={projectId}
        />
      )}

      {canEdit && activeVaultId && (
        <CreateVariableDialog
          open={createVariableOpen}
          onClose={() => setCreateVariableOpen(false)}
          projectId={projectId}
          vaultId={activeVaultId}
        />
      )}

      {canEdit && editingVariable && (
        <EditVariableDialog
          open={!!editingVariable}
          onClose={() => setEditingVariable(null)}
          projectId={projectId}
          vaultId={activeVaultId ?? ""}
          variable={editingVariable}
        />
      )}
    </>
  );
}
