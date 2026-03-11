"use client";

import { useState, type ReactElement } from "react";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
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
import { GlassCard } from "@/components/ui/glass-card";
import { MaskedValue } from "@/components/ui/masked-value";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { EnvVariable } from "@/types/api/env-variable";

interface VaultVariableTableProps {
  projectId: string;
  environmentType: string;
  variables: EnvVariable[];
  isLoading: boolean;
  canEdit: boolean;
  onEditVariable: (variable: EnvVariable) => void;
}

export function VaultVariableTable(props: VaultVariableTableProps): ReactElement {
  const { projectId, environmentType, variables, isLoading, canEdit, onEditVariable } = props;
  const [deleteTarget, setDeleteTarget] = useState<EnvVariable | null>(null);

  const deleteMutation = useApiMutation(
    (varId: string) =>
      client.api.projects({ id: projectId }).environments.variables({ varId }).delete(),
    {
      invalidateKeys: [["env-variables", projectId, environmentType]],
      successMessage: "Variable deleted",
      onSuccess: () => setDeleteTarget(null),
    },
  );

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

  return (
    <>
      <GlassCard>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Required</TableCell>
                {canEdit && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {variables.map((variable) => (
                <TableRow key={variable.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                      {variable.key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <MaskedValue value={variable.value} />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ maxWidth: 200 }}
                    >
                      {variable.description || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {variable.isRequired && (
                      <Chip label="Required" size="small" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton size="small" onClick={() => onEditVariable(variable)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setDeleteTarget(variable)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Variable</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.key}</strong>? This action cannot
            be undone.
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
