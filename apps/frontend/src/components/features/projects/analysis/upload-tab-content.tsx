"use client";

import { useState, type ReactElement } from "react";
import { CloudUpload as UploadIcon } from "@mui/icons-material";
import { Box, Button, DialogActions, MenuItem, Stack, TextField } from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
import { ECOSYSTEMS, type EcosystemValue } from "./analysis-utils";

interface UploadTabContentProps {
  projectId: string;
  onClose: () => void;
}

export function UploadTabContent(props: UploadTabContentProps): ReactElement {
  const { projectId, onClose } = props;
  const notification = useToast();
  const [ecosystem, setEcosystem] = useState<EcosystemValue>("NODEJS");
  const [fileName, setFileName] = useState("package.json");
  const [filePath, setFilePath] = useState("");
  const [content, setContent] = useState("");

  const mutation = useApiMutation(
    (values: {
      projectId: string;
      fileName: string;
      filePath?: string;
      content: string;
      ecosystem: EcosystemValue;
    }) => client.api.analyses.post(values),
    {
      invalidateKeys: [["analyses", projectId]],
      onSuccess: () => {
        notification.success("Analysis created successfully");
        onClose();
      },
      onError: () => {
        notification.error("Failed to create analysis");
      },
    },
  );

  const handleEcosystemChange = (value: EcosystemValue) => {
    setEcosystem(value);
    const eco = ECOSYSTEMS.find((e) => e.value === value);
    if (eco) setFileName(eco.defaultFile);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      notification.error("Please provide file content");
      return;
    }
    mutation.mutate({ projectId, fileName, ...(filePath && { filePath }), content, ecosystem });
  };

  return (
    <Stack spacing={2.5}>
      <TextField
        select
        label="Ecosystem"
        value={ecosystem}
        onChange={(e) => handleEcosystemChange(e.target.value as EcosystemValue)}
        fullWidth
      >
        {ECOSYSTEMS.map((eco) => (
          <MenuItem key={eco.value} value={eco.value}>
            {eco.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="File Name"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        fullWidth
      />

      <TextField
        label="File Path (optional)"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        fullWidth
        placeholder="e.g., packages/api/package.json"
        helperText="Useful for monorepos to distinguish files with the same name"
      />

      <Box>
        <Button variant="outlined" component="label" startIcon={<UploadIcon />} sx={{ mb: 1.5 }}>
          Upload File
          <input type="file" hidden onChange={handleFileUpload} accept=".json,.txt,.toml" />
        </Button>
        <TextField
          label="File Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          multiline
          rows={8}
          fullWidth
          placeholder="Paste your dependency file content here or upload a file above"
        />
      </Box>

      <DialogActions sx={{ px: 0, pb: 0 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending || !content.trim()}
        >
          {mutation.isPending ? "Analyzing..." : "Analyze"}
        </Button>
      </DialogActions>
    </Stack>
  );
}
