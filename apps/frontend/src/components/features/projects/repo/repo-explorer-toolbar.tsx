"use client";

import { type ReactElement, type ReactNode } from "react";
import { Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";
import { Chip, IconButton, InputAdornment, Stack, TextField } from "@mui/material";
import { ALL_ENVIRONMENTS } from "./repo-filter";

interface RepoExplorerToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  environments: string[];
  envFilter: string;
  onEnvFilterChange: (env: string) => void;
  /** Optional trailing actions next to the search box (e.g. the vault export menu). */
  actions?: ReactNode;
}

/** Explorer header: a search box plus a row of environment filter chips. */
export function RepoExplorerToolbar(props: RepoExplorerToolbarProps): ReactElement {
  const { search, onSearchChange, environments, envFilter, onEnvFilterChange, actions } = props;

  return (
    <Stack spacing={1.5} sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search files & apps"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => onSearchChange("")}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        {actions}
      </Stack>

      {environments.length > 0 && (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
          <Chip
            size="small"
            label="All"
            color={envFilter === ALL_ENVIRONMENTS ? "primary" : "default"}
            variant={envFilter === ALL_ENVIRONMENTS ? "filled" : "outlined"}
            onClick={() => onEnvFilterChange(ALL_ENVIRONMENTS)}
          />
          {environments.map((env) => (
            <Chip
              key={env}
              size="small"
              label={env}
              color={envFilter === env ? "primary" : "default"}
              variant={envFilter === env ? "filled" : "outlined"}
              onClick={() => onEnvFilterChange(env)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
