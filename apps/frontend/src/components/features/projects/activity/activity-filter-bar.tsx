"use client";

import { useEffect, useState, type ReactElement } from "react";
import { Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";
import { Button, InputAdornment, MenuItem, Stack, TextField } from "@mui/material";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { AuditAction, AuditResourceType } from "@/types/api/audit-log";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
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
] as const;

export interface AuditLogFilters {
  action: AuditAction | "";
  resourceType: AuditResourceType | "";
  from: string;
  to: string;
  userEmail: string;
}

export const EMPTY_FILTERS: AuditLogFilters = {
  action: "",
  resourceType: "",
  from: "",
  to: "",
  userEmail: "",
};

interface ActivityFilterBarProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
}

export function ActivityFilterBar(props: ActivityFilterBarProps): ReactElement {
  const { filters, onFiltersChange } = props;
  const [emailInput, setEmailInput] = useState(filters.userEmail);
  const debouncedEmail = useDebouncedValue(emailInput, 400);

  useEffect(() => {
    if (debouncedEmail === filters.userEmail) {
      return;
    }
    onFiltersChange({ ...filters, userEmail: debouncedEmail });
  }, [debouncedEmail, filters, onFiltersChange]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const handleChange = (field: keyof AuditLogFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    setEmailInput("");
    onFiltersChange(EMPTY_FILTERS);
  };

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
        sx={{ minWidth: 150 }}
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
        sx={{ minWidth: 160 }}
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
        sx={{ minWidth: 160 }}
      />

      <TextField
        type="date"
        label="To"
        size="small"
        value={filters.to}
        onChange={(e) => handleChange("to", e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />

      <TextField
        label="User Email"
        size="small"
        value={emailInput}
        onChange={(e) => setEmailInput(e.target.value)}
        placeholder="Search by email..."
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: 200 }}
      />

      {hasActiveFilters && (
        <Button
          variant="text"
          size="small"
          startIcon={<ClearIcon />}
          onClick={handleClear}
          sx={{ alignSelf: "center" }}
        >
          Clear
        </Button>
      )}
    </Stack>
  );
}
