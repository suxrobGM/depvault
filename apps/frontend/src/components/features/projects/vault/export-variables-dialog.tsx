"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { CONFIG_FORMATS, type ConfigFormat } from "@depvault/shared/constants";
import { serializeConfig, type ConfigEntry } from "@depvault/shared/serializers";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CopyButton } from "@/components/ui/inputs";
import { useApiQuery } from "@/hooks/use-api-query";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { decrypt } from "@/lib/crypto";
import type { ExportResult } from "@/types/api/env-variable";
import { downloadFile } from "@/utils/download-file";

interface ExportVariablesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultId: string;
  vaultName?: string;
}

export function ExportVariablesDialog(props: ExportVariablesDialogProps): ReactElement {
  const { open, onClose, projectId, vaultId, vaultName } = props;
  const { getProjectDEK } = useVault();
  const [format, setFormat] = useState<ConfigFormat>("env");
  const [decryptResult, setDecryptResult] = useState<{ content: string; key: string } | null>(null);
  const effectKeyRef = useRef("");

  const { data } = useApiQuery<ExportResult>(
    ["env-export", projectId, vaultId],
    () => client.api.projects({ id: projectId }).vaults({ vaultId }).export.get(),
    { enabled: open && !!vaultId },
  );

  const hasEntries = !!data?.entries?.length;
  const currentKey = `${projectId}:${vaultId}:${data?.entries?.length ?? 0}:${format}`;
  const decrypting = hasEntries && decryptResult?.key !== currentKey;
  const displayContent =
    hasEntries && decryptResult?.key === currentKey ? decryptResult.content : null;

  useEffect(() => {
    if (!data?.entries?.length) return;
    const key = `${projectId}:${vaultId}:${data.entries.length}:${format}`;
    if (effectKeyRef.current === key) return;

    effectKeyRef.current = key;
    let cancelled = false;

    getProjectDEK(projectId).then(async (dek) => {
      const decryptedEntries: ConfigEntry[] = await Promise.all(
        data.entries
          .filter((e) => !!e.encryptedValue)
          .map(async (entry) => {
            const result: ConfigEntry = {
              key: entry.key,
              value: await decrypt(entry.encryptedValue, entry.iv, entry.authTag, dek),
            };
            if (entry.encryptedComment && entry.commentIv && entry.commentAuthTag) {
              result.comment = await decrypt(
                entry.encryptedComment,
                entry.commentIv,
                entry.commentAuthTag,
                dek,
              );
            }
            return result;
          }),
      );
      if (!cancelled) {
        setDecryptResult({ content: serializeConfig(format, decryptedEntries), key });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [data, format, projectId, vaultId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = () => {
    if (!displayContent) return;
    const ext = format === "env" ? ".env" : `.${format}`;
    const base = (vaultName ?? "vault").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    downloadFile(displayContent, `${base}${ext}`);
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
          {decrypting && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {displayContent && !decrypting && (
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
                {displayContent}
              </Typography>
              <Box sx={{ position: "absolute", top: 4, right: 4 }}>
                <CopyButton value={displayContent} notification="Copied to clipboard" />
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleDownload} disabled={!displayContent}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
}
