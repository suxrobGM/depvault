"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  DialogActions,
  FormControlLabel,
  InputAdornment,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import type { GitHubDependencyFile, GitHubRepoListResponse } from "@/types/api/github";
import type { EcosystemValue } from "./analysis-utils";

interface GitHubTabContentProps {
  projectId: string;
  onClose: () => void;
}

export function GitHubTabContent(props: GitHubTabContentProps): ReactElement {
  const { projectId, onClose } = props;
  const { user } = useAuth();
  const notification = useNotification();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<GitHubDependencyFile[]>([]);
  const [repoSearch, setRepoSearch] = useState("");

  const hasGitHub = !!user?.githubId;

  const { data: reposData, isLoading: reposLoading } = useApiQuery<GitHubRepoListResponse>(
    ["github-repos"],
    () => client.api.github.repos.get({ query: { page: 1, limit: 100 } }),
    { enabled: hasGitHub && step === 0 },
  );

  const { data: depFiles, isLoading: filesLoading } = useApiQuery<GitHubDependencyFile[]>(
    ["github-dep-files", selectedRepo?.owner, selectedRepo?.repo],
    () => {
      if (!selectedRepo) throw new Error("No repo selected");
      return client.api.github
        .repos({ owner: selectedRepo.owner })({ repo: selectedRepo.repo })
        ["dependency-files"].get();
    },
    { enabled: !!selectedRepo && step === 1 },
  );

  const analysisMutation = useApiMutation(
    (values: { projectId: string; fileName: string; content: string; ecosystem: EcosystemValue }) =>
      client.api.analyses.post(values),
  );

  const handleSelectRepo = (fullName: string) => {
    const [owner, repo] = fullName.split("/");
    if (!owner || !repo) return;
    setSelectedRepo({ owner, repo });
    setSelectedFiles([]);
    setStep(1);
  };

  const handleToggleFile = (file: GitHubDependencyFile) => {
    setSelectedFiles((prev) => {
      const exists = prev.some((f) => f.path === file.path);
      if (exists) return prev.filter((f) => f.path !== file.path);
      return [...prev, file];
    });
  };

  const handleAnalyze = async () => {
    if (!selectedRepo || selectedFiles.length === 0) return;

    let successCount = 0;
    for (const file of selectedFiles) {
      try {
        const { data: fileData } = await client.api.github
          .repos({ owner: selectedRepo.owner })({ repo: selectedRepo.repo })
          .content.get({ query: { path: file.path } });

        if (!fileData) continue;

        await analysisMutation.mutateAsync({
          projectId,
          fileName: file.name,
          content: fileData.content,
          ecosystem: file.ecosystem as EcosystemValue,
        });
        successCount++;
      } catch {
        notification.error(`Failed to analyze ${file.path}`);
      }
    }

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["analyses", projectId] });
      notification.success(
        `${successCount} ${successCount === 1 ? "analysis" : "analyses"} created`,
      );
      onClose();
    }
  };

  if (!hasGitHub) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
        <GitHubIcon sx={{ fontSize: 48, color: "text.secondary" }} />
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Link your GitHub account to import dependency files from your repositories.
        </Typography>
        <Button
          variant="contained"
          startIcon={<GitHubIcon />}
          component="a"
          href={`${API_BASE_URL}/api/auth/github`}
        >
          Link GitHub
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stepper activeStep={step} sx={{ mb: 1 }}>
        <Step>
          <StepLabel>Select Repository</StepLabel>
        </Step>
        <Step>
          <StepLabel>Select Files</StepLabel>
        </Step>
      </Stepper>

      {step === 0 && (
        <RepoSelector
          repoSearch={repoSearch}
          onSearchChange={setRepoSearch}
          reposLoading={reposLoading}
          repos={reposData?.items}
          onSelectRepo={handleSelectRepo}
        />
      )}

      {step === 1 && (
        <FileSelector
          selectedRepo={selectedRepo}
          filesLoading={filesLoading}
          depFiles={depFiles}
          selectedFiles={selectedFiles}
          onToggleFile={handleToggleFile}
          onBack={() => setStep(0)}
          onClose={onClose}
          onAnalyze={handleAnalyze}
          isPending={analysisMutation.isPending}
        />
      )}
    </Stack>
  );
}

interface RepoSelectorProps {
  repoSearch: string;
  onSearchChange: (value: string) => void;
  reposLoading: boolean;
  repos: GitHubRepoListResponse["items"] | undefined;
  onSelectRepo: (fullName: string) => void;
}

function RepoSelector(props: RepoSelectorProps): ReactElement {
  const { repoSearch, onSearchChange, reposLoading, repos, onSelectRepo } = props;

  return (
    <Box>
      <TextField
        placeholder="Search repositories..."
        value={repoSearch}
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
      {reposLoading && (
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
          ?.filter((r) => r.name.toLowerCase().includes(repoSearch.toLowerCase()))
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

interface FileSelectorProps {
  selectedRepo: { owner: string; repo: string } | null;
  filesLoading: boolean;
  depFiles: GitHubDependencyFile[] | undefined;
  selectedFiles: GitHubDependencyFile[];
  onToggleFile: (file: GitHubDependencyFile) => void;
  onBack: () => void;
  onClose: () => void;
  onAnalyze: () => void;
  isPending: boolean;
}

function FileSelector(props: FileSelectorProps): ReactElement {
  const {
    selectedRepo,
    filesLoading,
    depFiles,
    selectedFiles,
    onToggleFile,
    onBack,
    onClose,
    onAnalyze,
    isPending,
  } = props;

  return (
    <Box>
      <Button size="small" onClick={onBack} sx={{ mb: 1 }}>
        &larr; Back to repositories
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {selectedRepo?.owner}/{selectedRepo?.repo}
      </Typography>

      {filesLoading && (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={32} />
        </Stack>
      )}

      {depFiles && depFiles.length === 0 && (
        <Alert severity="info">No dependency files found in this repository.</Alert>
      )}

      <Stack spacing={1}>
        {depFiles?.map((file) => (
          <FormControlLabel
            key={file.path}
            control={
              <Checkbox
                checked={selectedFiles.some((f) => f.path === file.path)}
                onChange={() => onToggleFile(file)}
              />
            }
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">{file.path}</Typography>
                <Chip label={file.ecosystem} size="small" variant="outlined" />
              </Stack>
            }
          />
        ))}
      </Stack>

      <DialogActions sx={{ px: 0, pb: 0, mt: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onAnalyze}
          disabled={selectedFiles.length === 0 || isPending}
        >
          {isPending
            ? "Analyzing..."
            : `Analyze ${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"}`}
        </Button>
      </DialogActions>
    </Box>
  );
}
