"use client";

import type { ChangeEvent, ReactElement } from "react";
import type { ConfigFormat } from "@depvault/shared/constants";
import { CloudUpload as UploadIcon } from "@mui/icons-material";
import { Button } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { CONFIG_FILE_ACCEPT, detectFormatFromExtension } from "@/utils/config-format";

export interface FileUploadResult {
  content: string;
  detectedFormat: ConfigFormat | null;
  fileName: string;
}

interface FileUploadButtonProps {
  onFileRead: (result: FileUploadResult) => void;
  accept?: string;
  sx?: SxProps<Theme>;
}

/**
 * A reusable file upload button that reads the content of a selected file and returns it via callback.
 */
export function FileUploadButton(props: FileUploadButtonProps): ReactElement {
  const { onFileRead, accept = CONFIG_FILE_ACCEPT, sx } = props;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedFormat = detectFormatFromExtension(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      onFileRead({
        content: ev.target?.result as string,
        detectedFormat,
        fileName: file.name,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Button
      variant="outlined"
      component="label"
      startIcon={<UploadIcon />}
      size="small"
      sx={{ alignSelf: "flex-start", ...sx }}
    >
      Upload File
      <input type="file" hidden onChange={handleChange} accept={accept} />
    </Button>
  );
}
