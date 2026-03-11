"use client";

import type { ReactElement } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvTemplateDetailResponse } from "@/types/api/env-template";

interface TemplateDetailDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  templateId: string | null;
}

export function TemplateDetailDialog(props: TemplateDetailDialogProps): ReactElement {
  const { open, onClose, projectId, templateId } = props;

  const { data, isLoading } = useApiQuery<EnvTemplateDetailResponse>(
    ["env-template-detail", projectId, templateId],
    () =>
      client.api.projects({ id: projectId })["env-templates"]({ templateId: templateId! }).get(),
    { enabled: open && !!templateId },
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{data?.name ?? "Template Detail"}</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={40} />
            ))}
          </Stack>
        )}

        {data && (
          <Stack spacing={2}>
            {data.description && (
              <Typography variant="body2" color="text.secondary">
                {data.description}
              </Typography>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Key</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Required
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.variables.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                          {v.key}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {v.description || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {v.isRequired && (
                          <Chip label="Required" size="small" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
