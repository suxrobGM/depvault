"use client";

import type { ReactElement } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  DialogActions,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { LoadingSpinner } from "@/components/ui/feedback";
import type { GitHubDependencyFile } from "@/types/api/github";

interface GitHubFileSelectorProps {
  repoLabel: string;
  isLoading: boolean;
  files: GitHubDependencyFile[] | undefined;
  selectedFiles: GitHubDependencyFile[];
  isAnalyzing: boolean;
  onToggleFile: (file: GitHubDependencyFile) => void;
  onToggleAll: () => void;
  onBack: () => void;
  onClose: () => void;
  onAnalyze: () => void;
}

/**
 * Component that allows users to select dependency files from a GitHub repository for analysis.
 * @param props
 * @returns
 */
export function GitHubFileSelector(props: GitHubFileSelectorProps): ReactElement {
  const {
    repoLabel,
    isLoading,
    files,
    selectedFiles,
    isAnalyzing,
    onToggleFile,
    onToggleAll,
    onBack,
    onClose,
    onAnalyze,
  } = props;

  return (
    <Box>
      <Button size="small" onClick={onBack} disabled={isAnalyzing} sx={{ mb: 1 }}>
        &larr; Back to repositories
      </Button>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 1.5,
        }}
      >
        {repoLabel}
      </Typography>
      {isLoading && <LoadingSpinner size={32} py={3} />}
      {files && files.length === 0 && (
        <Alert severity="info">No dependency files found in this repository.</Alert>
      )}
      <Stack spacing={1}>
        {files && files.length > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFiles.length === files.length}
                indeterminate={selectedFiles.length > 0 && selectedFiles.length < files.length}
                onChange={onToggleAll}
                disabled={isAnalyzing}
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                Select all ({files.length})
              </Typography>
            }
          />
        )}
        {files?.map((file) => (
          <FormControlLabel
            key={file.path}
            sx={{ ml: 1 }}
            control={
              <Checkbox
                checked={selectedFiles.some((f) => f.path === file.path)}
                onChange={() => onToggleFile(file)}
                disabled={isAnalyzing}
              />
            }
            label={
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                }}
              >
                <Typography variant="body2">{file.path}</Typography>
                <Chip label={file.ecosystem} size="small" variant="outlined" />
              </Stack>
            }
          />
        ))}
      </Stack>
      <DialogActions sx={{ px: 0, pb: 0, mt: 2 }}>
        <Button onClick={onClose} disabled={isAnalyzing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onAnalyze}
          disabled={selectedFiles.length === 0 || isAnalyzing}
        >
          {isAnalyzing
            ? "Analyzing..."
            : `Analyze ${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"}`}
        </Button>
      </DialogActions>
    </Box>
  );
}
