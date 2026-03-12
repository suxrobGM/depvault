"use client";

import { useState, type ReactElement } from "react";
import {
  CONFIG_FORMATS,
  getEnvironmentLabel,
  type ConfigFormat,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CopyButton } from "@/components/ui/copy-button";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { ExportResult } from "@/types/api/env-variable";
import { downloadFile } from "@/utils/download-file";

interface ExportVariablesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  environmentType: EnvironmentTypeValue;
}

export function ExportVariablesDialog(props: ExportVariablesDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, environmentType } = props;
  const [format, setFormat] = useState<ConfigFormat>("env");
  const { data } = useApiQuery<ExportResult>(
    ["env-export", projectId, environmentType, format],
    () =>
      client.api
        .projects({ id: projectId })
        .environments.export.get({ query: { environmentType, format, vaultGroupId } }),
    { enabled: open && !!environmentType },
  );

  const handleDownload = () => {
    if (!data?.content) return;
    const ext = format === "env" ? ".env" : `.${format}`;
    downloadFile(data.content, `${getEnvironmentLabel(environmentType).toLowerCase()}${ext}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Variables</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            select
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ConfigFormat)}
            fullWidth
          >
            {CONFIG_FORMATS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
          {data?.content && (
            <Box sx={{ position: "relative" }}>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: "action.hover",
                  fontFamily: "monospace",
                  fontSize: 12,
                  overflow: "auto",
                  maxHeight: 300,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {data.content}
              </Typography>
              <Box sx={{ position: "absolute", top: 4, right: 4 }}>
                <CopyButton value={data.content} notification="Copied to clipboard" />
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleDownload} disabled={!data?.content}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
