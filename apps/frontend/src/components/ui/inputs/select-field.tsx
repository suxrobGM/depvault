import type { ReactElement } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  size?: "small" | "medium";
  minWidth?: number;
}

/** Generic select dropdown built from an options array. Supports optional label and placeholder item. */
export function SelectField(props: SelectFieldProps): ReactElement {
  const { value, onChange, options, label, placeholder, size = "small", minWidth = 140 } = props;

  const select = (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size={size}
      label={label}
      displayEmpty={!!placeholder}
      sx={label ? undefined : { minWidth }}
    >
      {placeholder && (
        <MenuItem value="">
          <em>{placeholder}</em>
        </MenuItem>
      )}
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  );

  if (label) {
    return (
      <FormControl size={size} sx={{ minWidth }}>
        <InputLabel>{label}</InputLabel>
        {select}
      </FormControl>
    );
  }

  return select;
}
