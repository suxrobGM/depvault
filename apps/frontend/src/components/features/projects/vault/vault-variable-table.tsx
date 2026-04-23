"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Delete as DeleteIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const filteredVariables = filterVariables(variables, search);
  const pageCount = Math.max(1, Math.ceil(filteredVariables.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const pagedVariables = filteredVariables.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage,
  );

  const selectedOnPage = pagedVariables.filter((v) => selectedIds.has(v.id)).length;
  const allSelected = pagedVariables.length > 0 && selectedOnPage === pagedVariables.length;
  const someSelected = selectedOnPage > 0 && selectedOnPage < pagedVariables.length;

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

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

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) {
      for (const v of pagedVariables) next.delete(v.id);
    } else {
      for (const v of pagedVariables) next.add(v.id);
    }
    setSelectedIds(next);
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

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 0.5 }}>
        <TextField
          size="small"
          placeholder="Search keys or descriptions..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ flex: 1, maxWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flex: 1 }} />
        {canEdit && selectedIds.size > 0 && (
          <>
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
          </>
        )}
      </Stack>
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
                <TableCell sx={{ width: "30%" }}>Key</TableCell>
                <TableCell sx={{ width: 180 }}>Value</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center" sx={{ width: 90 }}>
                  Required
                </TableCell>
                <TableCell align="right" sx={{ width: 64 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVariables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5}>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", textAlign: "center", py: 2 }}
                    >
                      No variables match your search.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pagedVariables.map((variable) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredVariables.length > 10 && (
          <TablePagination
            component="div"
            count={filteredVariables.length}
            page={safePage}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </GlassCard>
    </Stack>
  );
}

function filterVariables(variables: EnvVariable[], search: string): EnvVariable[] {
  const q = search.trim().toLowerCase();
  if (!q) {
    return variables;
  }
  return variables.filter(
    (v) => v.key.toLowerCase().includes(q) || (v.description?.toLowerCase().includes(q) ?? false),
  );
}
