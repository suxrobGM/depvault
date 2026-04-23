"use client";

import type { ReactElement } from "react";
import { Search as SearchIcon } from "@mui/icons-material";
import { Chip, InputAdornment, Stack, TextField } from "@mui/material";
import { VaultTagChip } from "./vault-tag-chip";

export const ALL_TAGS = "__all__";

interface VaultListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  tags: string[];
  activeTag: string;
  onTagChange: (tag: string) => void;
}

export function VaultListToolbar(props: VaultListToolbarProps): ReactElement {
  const { search, onSearchChange, tags, activeTag, onTagChange } = props;

  return (
    <Stack spacing={1} sx={{ p: 1.25, pb: 1 }}>
      <TextField
        size="small"
        placeholder="Search vaults..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
          },
        }}
      />
      {tags.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
          <Chip
            label="all"
            size="small"
            variant={activeTag === ALL_TAGS ? "filled" : "outlined"}
            onClick={() => onTagChange(ALL_TAGS)}
          />
          {tags.map((tag) => (
            <VaultTagChip
              key={tag}
              tag={tag}
              active={activeTag === tag}
              onClick={() => onTagChange(activeTag === tag ? ALL_TAGS : tag)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
