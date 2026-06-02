"use client";

import { useState, type ReactElement } from "react";
import { FolderOpen as FolderIcon } from "@mui/icons-material";
import { Box, Grid, Paper, Skeleton, Stack, Tab, Tabs, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { MemberListResponseDto } from "@/types/api/project";
import type { RepoMapAppDto, RepoMapResponseDto } from "@/types/api/repo";
import { AppsSidebar } from "./apps-sidebar";
import { FileEditor } from "./file-editor";
import { FileList } from "./file-list";

interface RepoBrowserProps {
  projectId: string;
}

const ALL_ENVIRONMENTS = "__all__";

export function RepoBrowser(props: RepoBrowserProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string>(ALL_ENVIRONMENTS);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const { data: membersData } = useApiQuery<MemberListResponseDto>(
    queryKeys.projects.members(projectId),
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: repoMap, isLoading } = useApiQuery<RepoMapResponseDto>(
    queryKeys.repo.map(projectId),
    () => client.api.projects({ id: projectId })["repo-map"].get(),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";

  if (isLoading) {
    return <Skeleton variant="rounded" height={420} />;
  }

  const apps = repoMap?.apps ?? [];

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={<FolderIcon />}
        title="No apps yet"
        description="Push config and secret files with the DepVault CLI to populate this project's repository view."
      />
    );
  }

  const selectedApp: RepoMapAppDto = apps.find((a) => a.id === selectedAppId) ?? apps[0]!;

  const environments = selectedApp.environments;
  const activeEnv = selectedEnv === ALL_ENVIRONMENTS ? null : selectedEnv;

  const files = selectedApp.files.filter((f) => !activeEnv || f.environmentSlug === activeEnv);

  const activeFileId = files.some((f) => f.id === selectedFileId)
    ? selectedFileId
    : (files[0]?.id ?? null);

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    setSelectedEnv(ALL_ENVIRONMENTS);
    setSelectedFileId(null);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 3 }}>
        <AppsSidebar apps={apps} selectedAppId={selectedApp.id} onSelect={handleSelectApp} />
      </Grid>

      <Grid size={{ xs: 12, md: 9 }}>
        <Stack spacing={2}>
          {environments.length > 0 && (
            <Paper variant="outlined" sx={{ px: 1 }}>
              <Tabs
                value={environments.includes(selectedEnv) ? selectedEnv : ALL_ENVIRONMENTS}
                onChange={(_, value: string) => {
                  setSelectedEnv(value);
                  setSelectedFileId(null);
                }}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab value={ALL_ENVIRONMENTS} label="All environments" />
                {environments.map((env) => (
                  <Tab key={env} value={env} label={env} />
                ))}
              </Tabs>
            </Paper>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FileList files={files} selectedFileId={activeFileId} onSelect={setSelectedFileId} />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              {activeFileId ? (
                <FileEditor
                  key={activeFileId}
                  projectId={projectId}
                  fileId={activeFileId}
                  canEdit={canEdit ?? false}
                />
              ) : (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2Muted">No file selected.</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Stack>
      </Grid>
    </Grid>
  );
}
