"use client";

import type { ReactElement } from "react";
import { Clear as ClearIcon } from "@mui/icons-material";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import type { AuditAction, AuditResourceType } from "@/types/api/audit-log";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "READ", label: "Read" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "SHARE", label: "Share" },
  { value: "UPLOAD", label: "Upload" },
  { value: "CLONE", label: "Clone" },
] as const;

const RESOURCE_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "ENV_VARIABLE", label: "Env Variable" },
  { value: "ENV_TEMPLATE", label: "Env Template" },
  { value: "SECRET_FILE", label: "Secret File" },
  { value: "SHARE_LINK", label: "Share Link" },
  { value: "CI_TOKEN", label: "CI Token" },
] as const;

export interface GlobalActivityFilters {
  action: AuditAction | "";
  resourceType: AuditResourceType | "";
  from: string;
  to: string;
}

export const EMPTY_FILTERS: GlobalActivityFilters = {
  action: "",
  resourceType: "",
  from: "",
  to: "",
};

interface GlobalActivityFilterBarProps {
  filters: GlobalActivityFilters;
  onFiltersChange: (filters: GlobalActivityFilters) => void;
}

export function GlobalActivityFilterBar(props: GlobalActivityFilterBarProps): ReactElement {
  const { filters, onFiltersChange } = props;

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const handleChange = (field: keyof GlobalActivityFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const fieldSx = { minWidth: 150, flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" } } as const;

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ mb: 3, flexWrap: "wrap", rowGap: 2 }}
      className="vault-fade-up vault-delay-1"
    >
      <TextField
        select
        label="Action"
        size="small"
        value={filters.action}
        onChange={(e) => handleChange("action", e.target.value)}
        sx={fieldSx}
      >
        {ACTION_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Resource Type"
        size="small"
        value={filters.resourceType}
        onChange={(e) => handleChange("resourceType", e.target.value)}
        sx={fieldSx}
      >
        {RESOURCE_TYPE_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        type="date"
        label="From"
        size="small"
        value={filters.from}
        onChange={(e) => handleChange("from", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={fieldSx}
      />

      <TextField
        type="date"
        label="To"
        size="small"
        value={filters.to}
        onChange={(e) => handleChange("to", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={fieldSx}
      />

      {hasActiveFilters && (
        <Button
          variant="text"
          size="small"
          startIcon={<ClearIcon />}
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          sx={{ alignSelf: "center" }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
