"use client";

import { useState, type ReactElement } from "react";
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Replay as ReplayIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CreateShareLinkDialog } from "@/components/features/shared-secret/create-share-link-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { MaskedValue } from "@/components/ui/masked-value";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { EnvVariable, EnvVariableVersionListResponse } from "@/types/api/env-variable";
import { formatDate } from "@/utils/formatters";

export interface VaultVariableRowProps {
  projectId: string;
  environmentType: string;
  variable: EnvVariable;
  canEdit: boolean;
  onEdit: (variable: EnvVariable) => void;
}

export function VaultVariableRow(props: VaultVariableRowProps): ReactElement {
  const { projectId, environmentType, variable, canEdit, onEdit } = props;

  const confirm = useConfirm();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: versionsData, isLoading: versionsLoading } =
    useApiQuery<EnvVariableVersionListResponse>(
      ["env-variable-versions", projectId, variable.id],
      () =>
        client.api
          .projects({ id: projectId })
          .environments.variables({ varId: variable.id })
          .versions.get(),
      { enabled: historyOpen },
    );

  const deleteMutation = useApiMutation(
    () =>
      client.api
        .projects({ id: projectId })
        .environments.variables({ varId: variable.id })
        .delete(),
    {
      invalidateKeys: [["env-variables", projectId, environmentType]],
      successMessage: "Variable deleted",
    },
  );

  const rollbackMutation = useApiMutation(
    (versionId: string) =>
      client.api
        .projects({ id: projectId })
        .environments.variables({ varId: variable.id })
        .versions({ versionId })
        .rollback.post(),
    {
      invalidateKeys: [
        ["env-variables", projectId, environmentType],
        ["env-variable-versions", projectId, variable.id],
      ],
      successMessage: "Variable rolled back successfully",
    },
  );

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Variable",
      description: `Are you sure you want to delete "${variable.key}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  const versions = versionsData?.items ?? [];

  return (
    <>
      <TableRow hover sx={{ "& > *": { borderBottom: historyOpen ? "unset" : undefined } }}>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
            {variable.key}
          </Typography>
        </TableCell>
        <TableCell>
          <MaskedValue value={variable.value} />
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
            {variable.description || "—"}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {variable.isRequired && (
            <Chip label="Required" size="small" color="warning" variant="outlined" />
          )}
        </TableCell>
        <TableCell align="right">
          <ActionMenu
            items={[
              {
                label: "Edit",
                icon: <EditIcon fontSize="small" />,
                onClick: () => onEdit(variable),
                hidden: !canEdit,
              },
              {
                label: "Share",
                icon: <ShareIcon fontSize="small" />,
                onClick: () => setShareOpen(true),
                hidden: !canEdit,
              },
              {
                label: "Version History",
                icon: <HistoryIcon fontSize="small" />,
                onClick: () => setHistoryOpen(true),
              },
              {
                label: "Delete",
                icon: <DeleteIcon fontSize="small" />,
                onClick: handleDelete,
                hidden: !canEdit,
                destructive: true,
              },
            ]}
          />
        </TableCell>
      </TableRow>

      <CreateShareLinkDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={projectId}
        variable={variable}
      />

      <TableRow>
        <TableCell colSpan={5} sx={{ py: 0 }}>
          <Collapse in={historyOpen} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 6, pr: 2 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <HistoryIcon fontSize="small" />
                Version History
                <IconButton size="small" onClick={() => setHistoryOpen(false)} sx={{ ml: "auto" }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Typography>

              {versionsLoading ? (
                <Skeleton variant="rounded" height={60} />
              ) : versions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No previous versions.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Version</TableCell>
                      <TableCell>Changed by</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Value</TableCell>
                      {canEdit && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {versions.map((v, idx) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            v{versions.length - idx}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {v.changedByName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(v.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <MaskedValue value={v.value} />
                        </TableCell>
                        {canEdit && (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              title="Rollback to this version"
                              disabled={rollbackMutation.isPending}
                              onClick={() => rollbackMutation.mutate(v.id)}
                            >
                              <ReplayIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
