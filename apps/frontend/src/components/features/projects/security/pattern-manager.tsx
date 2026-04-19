"use client";

import { useState, type ReactElement } from "react";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Lock as LockIcon,
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
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { PatternListResponse, PatternResponse } from "@/types/api/secret-scan";
import { CreatePatternDialog } from "./create-pattern-dialog";

interface PatternManagerProps {
  projectId: string;
}

const SEVERITY_COLORS: Record<string, "error" | "warning" | "info" | "success"> = {
  CRITICAL: "error",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "success",
};

export function PatternManager(props: PatternManagerProps): ReactElement {
  const { projectId } = props;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<PatternResponse | null>(null);

  const { data } = useApiQuery<PatternListResponse>(
    ["scan-patterns", projectId],
    () => client.api.projects({ id: projectId })["scan-patterns"].get(),
    { errorMessage: "Failed to load patterns" },
  );

  const deletePattern = useApiMutation<{ message: string }, string>(
    (patternId) => client.api.projects({ id: projectId })["scan-patterns"]({ patternId }).delete(),
    {
      invalidateKeys: [["scan-patterns", projectId]],
      successMessage: "Pattern deleted",
    },
  );

  const patterns = data?.items ?? [];
  const builtIn = patterns.filter((p) => p.isBuiltIn);
  const custom = patterns.filter((p) => !p.isBuiltIn);

  return (
    <>
      <GlassCard>
        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
              }}
            >
              Scan Patterns
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingPattern(null);
                setDialogOpen(true);
              }}
            >
              Add Pattern
            </Button>
          </Stack>

          {custom.length > 0 && (
            <>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  mb: 1,
                  display: "block",
                }}
              >
                Custom Patterns
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Regex</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {custom.map((pattern) => (
                      <TableRow key={pattern.id} hover>
                        <TableCell>
                          <Typography variant="body2">{pattern.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              maxWidth: 300,
                            }}
                          >
                            {pattern.regex}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={pattern.severity}
                            size="small"
                            color={SEVERITY_COLORS[pattern.severity] ?? "default"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{
                              justifyContent: "flex-end",
                            }}
                          >
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingPattern(pattern);
                                  setDialogOpen(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deletePattern.mutate(pattern.id)}
                                disabled={deletePattern.isPending}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              mb: 1,
              display: "block",
            }}
          >
            Built-in Patterns
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Regex</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell align="right" width={60} />
                </TableRow>
              </TableHead>
              <TableBody>
                {builtIn.map((pattern) => (
                  <TableRow key={pattern.id}>
                    <TableCell>
                      <Typography variant="body2">{pattern.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          maxWidth: 300,
                        }}
                      >
                        {pattern.regex}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pattern.severity}
                        size="small"
                        color={SEVERITY_COLORS[pattern.severity] ?? "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Built-in (read-only)">
                        <LockIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </GlassCard>
      <CreatePatternDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPattern(null);
        }}
        projectId={projectId}
        editingPattern={editingPattern}
      />
    </>
  );
}
