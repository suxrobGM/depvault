"use client";

import type { ReactElement } from "react";
import { GitHub as GitHubIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import type { GitHubRepoListResponse } from "@/types/api/github";

interface GitHubRepoSelectorProps {
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  repos: GitHubRepoListResponse["items"] | undefined;
  onSelectRepo: (fullName: string) => void;
}

/**
 * Component that allows users to search and select a GitHub repository from a list.
 * It displays a search input, a loading state, and a list of repositories with their name, description, language, and privacy status.
 * When a repository is clicked, it calls the onSelectRepo callback with the repository's full name.
 */
export function GitHubRepoSelector(props: GitHubRepoSelectorProps): ReactElement {
  const { search, onSearchChange, isLoading, repos, onSelectRepo } = props;

  return (
    <Box>
      <TextField
        placeholder="Search repositories..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      {isLoading && (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={32} />
        </Stack>
      )}
      <Box
        sx={{
          maxHeight: 300,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          pr: 0.5,
        }}
      >
        {repos
          ?.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
          .map((repo) => (
            <GlassCard
              key={repo.id}
              sx={{ flexShrink: 0, "&:hover": { borderColor: "primary.main" } }}
              onClick={() => onSelectRepo(repo.fullName)}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5 }}>
                <GitHubIcon fontSize="small" sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {repo.fullName}
                  </Typography>
                  {repo.description && (
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {repo.description}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  {repo.language && <Chip label={repo.language} size="small" variant="outlined" />}
                  {repo.isPrivate && <Chip label="Private" size="small" color="warning" />}
                </Stack>
              </Stack>
            </GlassCard>
          ))}
      </Box>
    </Box>
  );
}
