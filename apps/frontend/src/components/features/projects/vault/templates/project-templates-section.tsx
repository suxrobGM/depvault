"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { SkeletonList } from "@/components/ui/data-display";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvTemplateListResponse } from "@/types/api/env-template";
import type { VaultGroup } from "@/types/api/vault-group";
import { TemplateApplyDialog } from "./template-apply-dialog";
import { TemplateDetailDialog } from "./template-detail-dialog";
import { TemplateList } from "./template-list";
import { TemplateSaveDialog } from "./template-save-dialog";

interface ProjectTemplatesSectionProps {
  projectId: string;
  canEdit: boolean;
  vaultGroups: VaultGroup[];
}

export function ProjectTemplatesSection(props: ProjectTemplatesSectionProps): ReactElement {
  const { projectId, canEdit, vaultGroups } = props;

  const [saveOpen, setSaveOpen] = useState(false);
  const [viewTemplateId, setViewTemplateId] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading } = useApiQuery<EnvTemplateListResponse>(
    ["env-templates", projectId],
    () => client.api.projects({ id: projectId })["env-templates"].get(),
  );

  const groupsForDialogs = vaultGroups.map((g) => ({ id: g.id, name: g.name }));

  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Project Templates
        </Typography>
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

      {isLoading && <SkeletonList count={2} height={80} spacing={1} />}

      {templates && templates.length === 0 && (
        <EmptyState
          title="No templates yet"
          description="Save a set of variable keys as a reusable template to quickly scaffold new environments."
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

      {canEdit && (
        <TemplateSaveDialog
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          projectId={projectId}
          vaultGroups={groupsForDialogs}
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
          vaultGroups={groupsForDialogs}
          templateId={applyTemplateId}
          onSuccess={() => setApplyTemplateId(null)}
        />
      )}
    </Box>
  );
}
