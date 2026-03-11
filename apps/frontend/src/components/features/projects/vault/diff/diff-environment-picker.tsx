"use client";

import type { ReactElement } from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";
import type { EnvironmentItem } from "@/types/api/environment";

interface DiffEnvironmentPickerProps {
  environments: EnvironmentItem[];
  selected: string[];
  onChange: (envNames: string[]) => void;
}

export function DiffEnvironmentPicker(props: DiffEnvironmentPickerProps): ReactElement {
  const { environments, selected, onChange } = props;

  const options = environments.map((e) => e.name);

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_, value) => {
        if (value.length <= 3) onChange(value);
      }}
      renderTags={(value, getTagProps) =>
        value.map((name, index) => (
          <Chip {...getTagProps({ index })} key={name} label={name} size="small" color="primary" />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select environments to compare (2-3)"
          size="small"
          helperText={selected.length < 2 ? "Select at least 2 environments" : undefined}
        />
      )}
      size="small"
      sx={{ minWidth: 350 }}
    />
  );
}
