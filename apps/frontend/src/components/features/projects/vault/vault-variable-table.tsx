"use client";

import type { ReactElement } from "react";
import {
  Box,
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
import type { EnvVariable } from "@/types/api/env-variable";
import { VaultVariableRow } from "./vault-variable-row";

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
    <GlassCard>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="center">Required</TableCell>
              <TableCell align="center">History</TableCell>
              {canEdit && <TableCell align="right">Actions</TableCell>}
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
                onEdit={onEditVariable}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </GlassCard>
  );
}
