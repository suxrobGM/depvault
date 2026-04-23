"use client";

import type { ReactElement } from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { VaultTagListResponse } from "@/types/api/vault";

const BLESSED_TAGS: Record<string, string> = {
  prod: "#ef4444",
  staging: "#eab308",
  dev: "#10b981",
  preview: "#6366f1",
};

interface VaultTagInputProps {
  projectId: string;
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function VaultTagInput(props: VaultTagInputProps): ReactElement {
  const { projectId, value, onChange, label = "Tags", placeholder = "Add tags" } = props;

  const { data: existingTags } = useApiQuery<VaultTagListResponse>(["vault-tags", projectId], () =>
    client.api.projects({ id: projectId })["vault-tags"].get(),
  );

  const options = existingTags ?? [];

  return (
    <Autocomplete
      multiple
      freeSolo
      options={options}
      value={value}
      onChange={(_, next) => onChange(next.map((v) => v.trim()).filter(Boolean))}
      renderValue={(selected, getItemProps) =>
        selected.map((tag, index) => {
          const color = BLESSED_TAGS[tag.toLowerCase()];
          const itemProps = getItemProps({ index });
          return (
            <Chip
              {...itemProps}
              key={tag}
              label={tag}
              size="small"
              sx={color ? { bgcolor: color, color: "#fff" } : undefined}
            />
          );
        })
      }
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
    />
  );
}
