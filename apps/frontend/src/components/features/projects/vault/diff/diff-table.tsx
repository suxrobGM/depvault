"use client";

import { useState, type ReactElement } from "react";
import {
  CheckCircle as CheckIcon,
  ErrorOutline as MissingIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/cards";
import type { EnvDiffRow } from "@/types/api/environment";

interface DiffTableProps {
  environments: string[];
  rows: EnvDiffRow[];
}

const STATUS_CONFIG = {
  missing: { icon: MissingIcon, color: "error.main", label: "Missing" },
  match: { icon: CheckIcon, color: "success.main", label: "Match" },
} as const;

export function DiffTable(props: DiffTableProps): ReactElement {
  const { environments, rows } = props;
  const [revealAll, setRevealAll] = useState(false);

  if (rows.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No variables found in the selected environments.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={2}>
          <Chip
            icon={<MissingIcon />}
            label={`${rows.filter((r) => r.status === "missing").length} missing`}
            size="small"
            color="error"
            variant="outlined"
          />
          <Chip
            icon={<CheckIcon />}
            label={`${rows.filter((r) => r.status === "match").length} match`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Stack>
        <Button
          size="small"
          startIcon={revealAll ? <VisibilityOff /> : <Visibility />}
          onClick={() => setRevealAll((v) => !v)}
        >
          {revealAll ? "Hide All" : "Reveal All"}
        </Button>
      </Stack>

      <GlassCard>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 60 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Key</TableCell>
                {environments.map((env) => (
                  <TableCell key={env} sx={{ fontWeight: 700, minWidth: 200 }}>
                    {env}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const config = STATUS_CONFIG[row.status];
                return (
                  <TableRow key={row.key} hover>
                    <TableCell>
                      <Tooltip title={config.label}>
                        <config.icon fontSize="small" sx={{ color: config.color }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                          {row.key}
                        </Typography>
                        {row.isRequired && (
                          <Chip
                            label="Required"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ width: "fit-content" }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    {environments.map((env) => {
                      const cell = row.values[env];
                      if (!cell) {
                        return (
                          <TableCell key={env} sx={{ bgcolor: "rgba(211, 47, 47, 0.06)" }}>
                            <Typography variant="body2" color="error.main" fontStyle="italic">
                              not set
                            </Typography>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={env}>
                          <DiffCellValue value="[encrypted]" revealAll={revealAll} />
                          <Typography variant="caption" color="text.secondary" display="block">
                            {new Date(cell.updatedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    </Stack>
  );
}

function DiffCellValue(props: { value: string; revealAll: boolean }): ReactElement {
  const { value, revealAll } = props;
  const [localVisible, setLocalVisible] = useState(false);
  const visible = revealAll || localVisible;

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography
        variant="body2"
        fontFamily="monospace"
        sx={{
          userSelect: visible ? "text" : "none",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {visible ? value : "\u2022".repeat(12)}
      </Typography>
      {!revealAll && (
        <IconButton size="small" onClick={() => setLocalVisible((v) => !v)}>
          {visible ? <VisibilityOff sx={{ fontSize: 14 }} /> : <Visibility sx={{ fontSize: 14 }} />}
        </IconButton>
      )}
    </Stack>
  );
}
