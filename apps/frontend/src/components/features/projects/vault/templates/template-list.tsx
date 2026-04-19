"use client";

import { useState, type ReactElement } from "react";
import {
  PlayArrow as ApplyIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import {
  Button,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { EnvTemplateItem } from "@/types/api/env-template";

interface TemplateListProps {
  projectId: string;
  templates: EnvTemplateItem[];
  canEdit: boolean;
  onView: (templateId: string) => void;
  onApply: (templateId: string) => void;
}

export function TemplateList(props: TemplateListProps): ReactElement {
  const { projectId, templates, canEdit, onView, onApply } = props;
  const [deleteTarget, setDeleteTarget] = useState<EnvTemplateItem | null>(null);

  const deleteMutation = useApiMutation(
    (templateId: string) =>
      client.api.projects({ id: projectId })["env-templates"]({ templateId }).delete(),
    {
      invalidateKeys: [["env-templates", projectId]],
      successMessage: "Template deleted",
      errorMessage: "Failed to delete template",
      onSuccess: () => setDeleteTarget(null),
    },
  );

  return (
    <>
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid size={{ xs: 12, sm: 6 }} key={template.id}>
            <GlassCard>
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                        }}
                      >
                        {template.name}
                      </Typography>
                      {template.description && (
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{
                            color: "text.secondary",
                            maxWidth: 250,
                          }}
                        >
                          {template.description}
                        </Typography>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View variables">
                        <IconButton size="small" onClick={() => onView(template.id)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Apply to environment">
                          <IconButton size="small" onClick={() => onApply(template.id)}>
                            <ApplyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canEdit && (
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteTarget(template)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                    }}
                  >
                    <Chip
                      label={`${template.variableCount} variables`}
                      size="small"
                      variant="outlined"
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                      }}
                    >
                      {new Date(template.createdAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
