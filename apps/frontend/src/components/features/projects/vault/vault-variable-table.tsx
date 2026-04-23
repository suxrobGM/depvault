"use client";

import { useState, type ReactElement } from "react";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import { SkeletonList } from "@/components/ui/data-display";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { EnvVariable } from "@/types/api/env-variable";
import { VaultVariableRow } from "./vault-variable-row";

interface VaultVariableTableProps {
  projectId: string;
  vaultId: string;
  variables: EnvVariable[];
  isLoading?: boolean;
  canEdit?: boolean;
  onEditVariable?: (variable: EnvVariable) => void;
}

export function VaultVariableTable(props: VaultVariableTableProps): ReactElement {
  const {
    projectId,
    vaultId,
    variables,
    isLoading = false,
    canEdit = false,
    onEditVariable,
  } = props;
  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const batchDelete = useApiMutation(
    (ids: string[]) =>
      client.api
        .projects({ id: projectId })
        .vaults({ vaultId })
        .variables.batch.delete({ variableIds: ids }),
    {
      invalidateKeys: [["vault-variables", projectId, vaultId]],
      successMessage: "Variables deleted",
      onSuccess: () => setSelectedIds(new Set()),
    },
  );

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    const ok = await confirm({
      title: `Delete ${count} variable(s)`,
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) batchDelete.mutate([...selectedIds]);
  };

  if (isLoading) {
    return <SkeletonList count={3} height={48} spacing={1} />;
  }

  if (variables.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No variables in this vault yet.
        </Typography>
      </Box>
    );
  }

  const allSelected = variables.length > 0 && selectedIds.size === variables.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < variables.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(variables.map((v) => v.id)));
    }
  };

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <Stack spacing={1}>
      {canEdit && selectedIds.size > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {selectedIds.size} selected
          </Typography>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleBatchDelete}
          >
            Delete
          </Button>
        </Stack>
      )}
      <GlassCard>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {canEdit && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Required</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variables.map((variable) => (
                <VaultVariableRow
                  key={variable.id}
                  projectId={projectId}
                  vaultId={vaultId}
                  variable={variable}
                  canEdit={canEdit}
                  selected={selectedIds.has(variable.id)}
                  onToggleSelect={() => handleToggle(variable.id)}
                  onEdit={onEditVariable}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    </Stack>
  );
}
