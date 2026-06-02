"use client";

import { type ReactElement } from "react";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { MaskedTextField } from "@/components/ui/inputs";
import { looksLikeSecret } from "@/utils/detect-secret";
import { parseEnv, serializeEnv, type KeyValueRow } from "./file-format";

interface EnvFormEditorProps {
  text: string;
  readOnly: boolean;
  onChange: (text: string) => void;
}

/**
 * Structured key/value editor for `.env`-style files. Comments and blank lines are
 * preserved as display-only rows; edits round-trip back through `serializeEnv`.
 */
export function EnvFormEditor(props: EnvFormEditorProps): ReactElement {
  const { text, readOnly, onChange } = props;
  const rows = parseEnv(text);

  const commit = (next: KeyValueRow[]) => onChange(serializeEnv(next));

  const updateRow = (index: number, patch: Partial<KeyValueRow>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    commit(next);
  };

  const removeRow = (index: number) => {
    commit(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    commit([...rows, { key: "", value: "" }]);
  };

  const editableRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.raw === undefined || row.key !== "");

  if (editableRows.length === 0 && readOnly) {
    return <Typography variant="body2Muted">No key/value pairs in this file.</Typography>;
  }

  return (
    <Stack spacing={1.5}>
      {editableRows.map(({ row, index }) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField
            size="small"
            label="Key"
            value={row.key}
            disabled={readOnly}
            onChange={(e) => updateRow(index, { key: e.target.value })}
            sx={{ flex: "0 0 38%", "& input": { fontFamily: "monospace" } }}
          />
          <Box sx={{ color: "text.disabled", fontFamily: "monospace" }}>=</Box>
          <MaskedTextField
            label="Value"
            value={row.value}
            readOnly={readOnly}
            secret={looksLikeSecret(row.value, row.key)}
            onChange={(value) => updateRow(index, { value })}
          />
          {!readOnly && (
            <IconButton size="small" aria-label="Remove pair" onClick={() => removeRow(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      ))}

      {!readOnly && (
        <Box>
          <Button size="small" startIcon={<AddIcon />} onClick={addRow}>
            Add pair
          </Button>
        </Box>
      )}
    </Stack>
  );
}
