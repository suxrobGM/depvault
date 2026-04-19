"use client";

import { useRef, type ReactElement } from "react";
import { UploadFile as UploadFileIcon } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

interface FileDropZoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: string;
}

/** Dashed-border click-to-select file picker. Displays selected file name and size. */
export function FileDropZone(props: FileDropZoneProps): ReactElement {
  const { file, onChange, hint } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      sx={{
        border: 2,
        borderColor: file ? "primary.main" : "divider",
        borderStyle: "dashed",
        borderRadius: 2,
        p: 3,
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.2s",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <UploadFileIcon
        sx={{ fontSize: 40, color: file ? "primary.main" : "text.secondary", mb: 1 }}
      />
      {file ? (
        <>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
            }}
          >
            {file.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            {(file.size / 1024).toFixed(1)} KB — click to change
          </Typography>
        </>
      ) : (
        <>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Click to select a file
          </Typography>
          {hint && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              {hint}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
