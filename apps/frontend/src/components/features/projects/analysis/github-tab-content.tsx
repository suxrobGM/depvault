"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { Button, Stack, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import type { CreateAnalysisBody } from "@/types/api/analysis";
import type { GitHubDependencyFile, GitHubRepoListResponse } from "@/types/api/github";
import type { EcosystemValue } from "./analysis-utils";
import { GitHubFileSelector } from "./github-file-selector";
import { GitHubRepoSelector } from "./github-repo-selector";

interface GitHubTabContentProps {
  projectId: string;
  onClose: () => void;
}

export function GitHubTabContent(props: GitHubTabContentProps): ReactElement {
  const { projectId, onClose } = props;
  const { user } = useAuth();
  const notification = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<GitHubDependencyFile[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const analysisMutation = useApiMutation((values: CreateAnalysisBody) =>
    client.api.projects({ id: projectId }).analyses.post(values),
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

  const handleToggleAll = () => {
    if (!depFiles) return;
    if (selectedFiles.length === depFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles([...depFiles]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedRepo || selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    let successCount = 0;
    for (const file of selectedFiles) {
      try {
        const { data: fileData } = await client.api.github
          .repos({ owner: selectedRepo.owner })({ repo: selectedRepo.repo })
          .content.get({ query: { path: file.path } });

        if (!fileData) continue;

        await analysisMutation.mutateAsync({
          fileName: file.name,
          filePath: file.path,
          content: fileData.content,
          ecosystem: file.ecosystem as EcosystemValue,
        });
        successCount++;
      } catch {
        notification.error(`Failed to analyze ${file.path}`);
      }
    }

    setIsAnalyzing(false);
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
        <GitHubRepoSelector
          search={repoSearch}
          onSearchChange={setRepoSearch}
          isLoading={reposLoading}
          repos={reposData?.items}
          onSelectRepo={handleSelectRepo}
        />
      )}

      {step === 1 && (
        <GitHubFileSelector
          repoLabel={`${selectedRepo?.owner}/${selectedRepo?.repo}`}
          isLoading={filesLoading}
          files={depFiles}
          selectedFiles={selectedFiles}
          isAnalyzing={isAnalyzing}
          onToggleFile={handleToggleFile}
          onToggleAll={handleToggleAll}
          onBack={() => setStep(0)}
          onClose={onClose}
          onAnalyze={handleAnalyze}
        />
      )}
    </Stack>
  );
}
