"use client";

import { useState, type ReactElement } from "react";
import {
  CONFIG_FORMATS,
  type ConfigFormat,
  type EnvironmentTypeValue,
} from "@depvault/shared/constants";
import { FolderZip as FolderZipIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormSelectField } from "@/components/ui/form-select-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { EnvVariable } from "@/types/api/env-variable";
import type { EnvironmentBundleBody } from "@/types/api/environment";
import type { SecretFileListResponse } from "@/types/api/secret-file";
import { downloadFile } from "@/utils/download-file";

interface DownloadBundleDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  vaultGroupId: string;
  environmentType: EnvironmentTypeValue;
  variables: EnvVariable[];
}

export function DownloadBundleDialog(props: DownloadBundleDialogProps): ReactElement {
  const { open, onClose, projectId, vaultGroupId, environmentType, variables } = props;

  const [selectedVarIds, setSelectedVarIds] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const formatForm = useForm({
    defaultValues: { format: "env" as ConfigFormat },
  });

  const { data: secretFilesData } = useApiQuery<SecretFileListResponse>(
    ["secret-files", projectId, environmentType, "bundle"],
    () =>
      client.api.projects({ id: projectId }).secrets.get({
        query: { environmentType, page: 1, limit: 100 },
      }),
    { enabled: open },
  );

  const secretFiles = secretFilesData?.items ?? [];

  const mutation = useApiMutation(
    (body: EnvironmentBundleBody) =>
      client.api.projects({ id: projectId }).environments.bundle.post(body),
    {
      errorMessage: "Failed to download bundle",
      onSuccess: (result) => {
        const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
        downloadFile(bytes.buffer, result.fileName, "application/zip");
        handleClose();
      },
    },
  );

  const toggleVar = (id: string) => {
    setSelectedVarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFile = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVars = () => {
    if (selectedVarIds.size === variables.length) {
      setSelectedVarIds(new Set());
    } else {
      setSelectedVarIds(new Set(variables.map((v) => v.id)));
    }
  };

  const toggleAllFiles = () => {
    if (selectedFileIds.size === secretFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(secretFiles.map((f) => f.id)));
    }
  };

  const handleDownload = () => {
    const format = formatForm.getFieldValue("format") as ConfigFormat;
    mutation.mutate({
      vaultGroupId,
      environmentType,
      variableIds: Array.from(selectedVarIds),
      secretFileIds: Array.from(selectedFileIds),
      format: format as EnvironmentBundleBody["format"],
    });
  };

  const handleClose = () => {
    setSelectedVarIds(new Set());
    setSelectedFileIds(new Set());
    onClose();
  };

  const totalSelected = selectedVarIds.size + selectedFileIds.size;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FolderZipIcon fontSize="small" />
        Download Bundle
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box sx={{ minWidth: 200, maxWidth: 250 }}>
            <FormSelectField
              form={formatForm}
              name="format"
              label="Config format"
              items={CONFIG_FORMATS}
            />
          </Box>

          {variables.length > 0 && (
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedVarIds.size === variables.length}
                    indeterminate={
                      selectedVarIds.size > 0 && selectedVarIds.size < variables.length
                    }
                    onChange={toggleAllVars}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Variables ({variables.length})
                  </Typography>
                }
              />
              <Stack sx={{ ml: 3, maxHeight: 200, overflow: "auto" }}>
                {variables.map((v) => (
                  <FormControlLabel
                    key={v.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedVarIds.has(v.id)}
                        onChange={() => toggleVar(v.id)}
                      />
                    }
                    label={
                      <Typography variant="body2" fontFamily="monospace">
                        {v.key}
                      </Typography>
                    }
                  />
                ))}
              </Stack>
            </Stack>
          )}

          {secretFiles.length > 0 && (
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedFileIds.size === secretFiles.length}
                    indeterminate={
                      selectedFileIds.size > 0 && selectedFileIds.size < secretFiles.length
                    }
                    onChange={toggleAllFiles}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Secret Files ({secretFiles.length})
                  </Typography>
                }
              />
              <Stack sx={{ ml: 3, maxHeight: 200, overflow: "auto" }}>
                {secretFiles.map((f) => (
                  <FormControlLabel
                    key={f.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedFileIds.has(f.id)}
                        onChange={() => toggleFile(f.id)}
                      />
                    }
                    label={
                      <Typography variant="body2" fontFamily="monospace">
                        {f.name}
                      </Typography>
                    }
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending || totalSelected === 0}
          onClick={handleDownload}
          startIcon={
            mutation.isPending ? <CircularProgress size={16} color="inherit" /> : <FolderZipIcon />
          }
        >
          {mutation.isPending ? "Downloading..." : `Download (${totalSelected})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
