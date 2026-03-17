"use client";

import type { ReactElement } from "react";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Skeleton,
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
import type { EnvVariable } from "@/types/api/env-variable";
import { VaultVariableRow } from "./vault-variable-row";

interface VaultVariableTableProps {
  projectId: string;
  environmentType: string;
  variables: EnvVariable[];
  isLoading?: boolean;
  canEdit?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onEditVariable?: (variable: EnvVariable) => void;
  onBatchDelete?: () => void;
}

export function VaultVariableTable(props: VaultVariableTableProps): ReactElement {
  const {
    projectId,
    environmentType,
    variables,
    isLoading = false,
    canEdit = false,
    selectedIds = new Set(),
    onSelectionChange,
    onEditVariable,
    onBatchDelete,
  } = props;

  if (isLoading) {
    return (
      <Stack spacing={1}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={48} />
        ))}
      </Stack>
    );
  }

  if (variables.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No variables in this environment yet.
        </Typography>
      </Box>
    );
  }

  const allSelected = variables.length > 0 && selectedIds.size === variables.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < variables.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.(new Set());
    } else {
      onSelectionChange?.(new Set(variables.map((v) => v.id)));
    }
  };

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange?.(next);
  };

  return (
    <Stack spacing={1}>
      {canEdit && selectedIds.size > 0 && (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedIds.size} selected
          </Typography>
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={onBatchDelete}
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
                  environmentType={environmentType}
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
