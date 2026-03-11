"use client";

import { useState, type ReactElement } from "react";
import { VpnKey as VpnKeyIcon } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvVariable, EnvVariableListResponse } from "@/types/api/env-variable";
import type { EnvironmentListResponse } from "@/types/api/environment";
import { CloneEnvironmentDialog } from "./clone-environment-dialog";
import { CreateVariableDialog } from "./create-variable-dialog";
import { EnvDiffView } from "./diff/env-diff-view";
import { EditVariableDialog } from "./edit-variable-dialog";
import { EnvironmentSelector } from "./environment-selector";
import { ExportVariablesDialog } from "./export-variables-dialog";
import { ImportVariablesDialog } from "./import-variables-dialog";
import { EnvTemplatesView } from "./templates/env-templates-view";
import { VaultToolbar } from "./vault-toolbar";
import { VaultVariableTable } from "./vault-variable-table";

type VaultView = "variables" | "diff" | "templates";

interface VaultTabProps {
  projectId: string;
  canEdit: boolean;
}

export function VaultTab(props: VaultTabProps): ReactElement {
  const { projectId, canEdit } = props;

  const [view, setView] = useState<VaultView>("variables");
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnvVariable | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  const { data: environments } = useApiQuery<EnvironmentListResponse>(
    ["environments", projectId],
    () => client.api.projects({ id: projectId }).environments.get(),
  );

  const activeEnv = selectedEnv ?? environments?.[0]?.name ?? null;

  const { data: variablesData, isLoading: variablesLoading } = useApiQuery<EnvVariableListResponse>(
    ["env-variables", projectId, activeEnv],
    () =>
      client.api
        .projects({ id: projectId })
        .environments.variables.get({ query: { environment: activeEnv!, page: 1, limit: 100 } }),
    { enabled: !!activeEnv && view === "variables" },
  );

  if (!environments || environments.length === 0) {
    return (
      <Box className="vault-fade-up vault-delay-2">
        <EmptyState
          icon={<VpnKeyIcon />}
          title="No environments yet"
          description="Import variables from a .env file or create your first environment variable to get started."
          actionLabel={canEdit ? "Import Variables" : undefined}
          onAction={canEdit ? () => setImportOpen(true) : undefined}
        />
        {canEdit && (
          <ImportVariablesDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            projectId={projectId}
            environment="development"
          />
        )}
      </Box>
    );
  }

  if (view === "diff") {
    return (
      <Box className="vault-fade-up vault-delay-2">
        <EnvDiffView
          projectId={projectId}
          environments={environments}
          onBack={() => setView("variables")}
        />
      </Box>
    );
  }

  if (view === "templates") {
    return (
      <Box className="vault-fade-up vault-delay-2">
        <EnvTemplatesView
          projectId={projectId}
          canEdit={canEdit}
          environments={environments}
          currentEnvironment={activeEnv}
          onBack={() => setView("variables")}
          onEnvironmentCreated={(envName) => {
            setSelectedEnv(envName);
            setView("variables");
          }}
        />
      </Box>
    );
  }

  return (
    <Box className="vault-fade-up vault-delay-2">
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
          />
          <VaultToolbar
            canEdit={canEdit}
            hasEnvironment={!!activeEnv}
            onCreateVariable={() => setCreateOpen(true)}
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
            onCompare={() => setView("diff")}
            onClone={() => setCloneOpen(true)}
            onTemplates={() => setView("templates")}
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
            environment={activeEnv}
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
            environment={activeEnv}
          />
          <EditVariableDialog
            open={!!editTarget}
            onClose={() => setEditTarget(null)}
            projectId={projectId}
            environment={activeEnv}
            variable={editTarget}
          />
          <ImportVariablesDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            projectId={projectId}
            environment={activeEnv}
          />
          <CloneEnvironmentDialog
            open={cloneOpen}
            onClose={() => setCloneOpen(false)}
            projectId={projectId}
            sourceEnvironment={activeEnv}
            onSuccess={setSelectedEnv}
          />
        </>
      )}

      {activeEnv && (
        <ExportVariablesDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          projectId={projectId}
          environment={activeEnv}
        />
      )}
    </Box>
  );
}
