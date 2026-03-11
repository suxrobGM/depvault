"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, ArrowBack as BackIcon } from "@mui/icons-material";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvTemplateListResponse } from "@/types/api/env-template";
import type { EnvironmentItem } from "@/types/api/environment";
import { TemplateApplyDialog } from "./template-apply-dialog";
import { TemplateDetailDialog } from "./template-detail-dialog";
import { TemplateList } from "./template-list";
import { TemplateSaveDialog } from "./template-save-dialog";

interface EnvTemplatesViewProps {
  projectId: string;
  vaultGroupId: string;
  canEdit: boolean;
  environments: EnvironmentItem[];
  currentEnvironment: string | null;
  onBack: () => void;
  onEnvironmentCreated: (envType: string) => void;
}

export function EnvTemplatesView(props: EnvTemplatesViewProps): ReactElement {
  const {
    projectId,
    vaultGroupId,
    canEdit,
    environments,
    currentEnvironment,
    onBack,
    onEnvironmentCreated,
  } = props;

  const [saveOpen, setSaveOpen] = useState(false);
  const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading } = useApiQuery<EnvTemplateListResponse>(
    ["env-templates", projectId],
    () => client.api.projects({ id: projectId })["env-templates"].get(),
  );

  return (
    <Box>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button startIcon={<BackIcon />} onClick={onBack} size="small">
              Variables
            </Button>
            <Typography variant="subtitle1" fontWeight={600}>
              Templates
            </Typography>
          </Stack>
          {canEdit && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setSaveOpen(true)}
            >
              Save Template
            </Button>
          )}
        </Stack>

        {isLoading && (
          <Stack spacing={1}>
            {[1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={80} />
            ))}
          </Stack>
        )}

        {templates && templates.length === 0 && (
          <EmptyState
            title="No templates yet"
            description="Save an environment as a template to quickly bootstrap new environments."
            actionLabel={canEdit ? "Save Template" : undefined}
            onAction={canEdit ? () => setSaveOpen(true) : undefined}
          />
        )}

        {templates && templates.length > 0 && (
          <TemplateList
            projectId={projectId}
            templates={templates}
            canEdit={canEdit}
            onView={setViewTemplateId}
            onApply={setApplyTemplateId}
          />
        )}
      </Stack>

      {canEdit && (
        <TemplateSaveDialog
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          projectId={projectId}
          environments={environments}
          currentEnvironment={currentEnvironment}
        />
      )}

      <TemplateDetailDialog
        open={!!viewTemplateId}
        onClose={() => setViewTemplateId(null)}
        projectId={projectId}
        templateId={viewTemplateId}
      />

      {canEdit && (
        <TemplateApplyDialog
          open={!!applyTemplateId}
          onClose={() => setApplyTemplateId(null)}
          projectId={projectId}
          vaultGroupId={vaultGroupId}
          templateId={applyTemplateId}
          onSuccess={onEnvironmentCreated}
        />
      )}
    </Box>
  );
}
