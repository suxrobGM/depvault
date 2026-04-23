"use client";

import type { ReactElement } from "react";
import {
  Close as CloseIcon,
  History as HistoryIcon,
  Replay as ReplayIcon,
} from "@mui/icons-material";
import {
  Box,
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
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvVariableVersion, EnvVariableVersionListResponse } from "@/types/api/env-variable";
import { formatDate } from "@/utils/formatters";
import { EncryptedValue } from "./encrypted-value";

interface VaultVariableHistoryProps {
  projectId: string;
  vaultId: string;
  variableId: string;
  canEdit: boolean;
  colSpan: number;
  open: boolean;
  onClose: () => void;
}

export function VaultVariableHistory(props: VaultVariableHistoryProps): ReactElement {
  const { projectId, vaultId, variableId, canEdit, colSpan, open, onClose } = props;

  const { data, isLoading } = useApiQuery<EnvVariableVersionListResponse>(
    ["env-variable-versions", projectId, variableId],
    () =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId })
        .variables({ varId: variableId })
        .versions.get(),
    { enabled: open },
  );

  const rollback = useApiMutation(
    (versionId: string) =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId })
        .variables({ varId: variableId })
        .versions({ versionId })
        .rollback.post(),
    {
      invalidateKeys: [
        ["vault-variables", projectId, vaultId],
        ["env-variable-versions", projectId, variableId],
      ],
      successMessage: "Variable rolled back successfully",
    },
  );

  const versions = data?.items ?? [];

  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: 0 }}>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ py: 2, pl: 6, pr: 2 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <HistoryIcon fontSize="small" />
              Version History
              <IconButton size="small" onClick={onClose} sx={{ ml: "auto" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Typography>

            {isLoading ? (
              <Skeleton variant="rounded" height={60} />
            ) : versions.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No previous versions.
              </Typography>
            ) : (
              <VersionTable
                projectId={projectId}
                versions={versions}
                canEdit={canEdit}
                rollbackPending={rollback.isPending}
                onRollback={(versionId) => rollback.mutate(versionId)}
              />
            )}
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

interface VersionTableProps {
  projectId: string;
  versions: EnvVariableVersion[];
  canEdit: boolean;
  rollbackPending: boolean;
  onRollback: (versionId: string) => void;
}

function VersionTable(props: VersionTableProps): ReactElement {
  const { projectId, versions, canEdit, rollbackPending, onRollback } = props;

  return (
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
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                v{versions.length - idx}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {v.changedByName}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
                  disabled={rollbackPending}
                  onClick={() => onRollback(v.id)}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
