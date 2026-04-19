"use client";

import { useState, type ReactElement } from "react";
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Replay as ReplayIcon,
  Share as ShareIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CreateShareLinkDialog } from "@/components/features/shared-secret/create-share-link-dialog";
import { ActionMenu } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { decrypt } from "@/lib/crypto";
import type { EnvVariable, EnvVariableVersionListResponse } from "@/types/api/env-variable";
import { formatDate } from "@/utils/formatters";

export interface VaultVariableRowProps {
  projectId: string;
  environmentType: string;
  variable: EnvVariable;
  canEdit: boolean;
  selected: boolean;
  onToggleSelect?: () => void;
  onEdit?: (variable: EnvVariable) => void;
}

interface EncryptedValueProps {
  projectId: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
}

/** Decrypts a value on-demand when the user clicks the reveal toggle. */
function EncryptedValue(props: EncryptedValueProps): ReactElement {
  const { projectId, encryptedValue, iv, authTag } = props;
  const { getProjectDEK } = useVault();
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = async () => {
    if (visible) {
      setVisible(false);
      return;
    }

    if (decrypted !== null) {
      setVisible(true);
      return;
    }

    try {
      const dek = await getProjectDEK(projectId);
      const plaintext = await decrypt(encryptedValue, iv, authTag, dek);
      setDecrypted(plaintext);
      setVisible(true);
    } catch {
      setError(true);
    }
  };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: "center",
      }}
    >
      <Typography
        variant="body2"
        color={error ? "error" : undefined}
        sx={{
          fontFamily: "monospace",
          userSelect: visible ? "text" : "none",
        }}
      >
        {error ? "Decryption failed" : visible ? decrypted : "\u2022".repeat(12)}
      </Typography>
      {!error && (
        <IconButton size="small" onClick={handleToggle} aria-label="Toggle visibility">
          {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
        </IconButton>
      )}
    </Stack>
  );
}

export function VaultVariableRow(props: VaultVariableRowProps): ReactElement {
  const { projectId, environmentType, variable, canEdit, selected, onToggleSelect, onEdit } = props;

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
      <TableRow
        hover
        selected={selected}
        sx={{ "& > *": { borderBottom: historyOpen ? "unset" : undefined } }}
      >
        {canEdit && (
          <TableCell padding="checkbox">
            <Checkbox size="small" checked={selected} onChange={onToggleSelect} />
          </TableCell>
        )}
        <TableCell>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            {variable.key}
          </Typography>
        </TableCell>
        <TableCell>
          <EncryptedValue
            projectId={projectId}
            encryptedValue={variable.encryptedValue}
            iv={variable.iv}
            authTag={variable.authTag}
          />
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            noWrap
            sx={{
              color: "text.secondary",
              maxWidth: 200,
            }}
          >
            {variable.description ?? "—"}
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
                onClick: () => onEdit?.(variable),
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
        variables={[variable]}
      />
      <TableRow>
        <TableCell colSpan={canEdit ? 6 : 5} sx={{ py: 0 }}>
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
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
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
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                            }}
                          >
                            v{versions.length - idx}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                            }}
                          >
                            {v.changedByName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                            }}
                          >
                            {formatDate(v.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <EncryptedValue
                            projectId={projectId}
                            encryptedValue={v.encryptedValue}
                            iv={v.iv}
                            authTag={v.authTag}
                          />
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
