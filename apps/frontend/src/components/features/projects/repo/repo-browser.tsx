"use client";

import { useState, type ReactElement } from "react";
import { FolderOpen as FolderIcon } from "@mui/icons-material";
import { Grid, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { MemberListResponseDto } from "@/types/api/project";
import type { RepoMapResponseDto } from "@/types/api/repo";
import { FileEditor } from "./file-editor";
import { RepoExplorerToolbar } from "./repo-explorer-toolbar";
import { ALL_ENVIRONMENTS, filterApps } from "./repo-filter";
import { RepoSummaryStrip } from "./repo-summary-strip";
import { RepoTree } from "./repo-tree";
import { VaultExportMenu } from "./vault-export-menu";

interface RepoBrowserProps {
  projectId: string;
  projectName: string;
}

export function RepoBrowser(props: RepoBrowserProps): ReactElement {
  const { projectId, projectName } = props;
  const { user } = useAuth();

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [envFilter, setEnvFilter] = useState<string>(ALL_ENVIRONMENTS);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

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
    return <Skeleton variant="rounded" height={480} />;
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

  const environments = [...new Set(apps.flatMap((app) => app.environments))].sort();
  const filteredApps = filterApps(apps, envFilter, debouncedSearch);
  const visibleFiles = filteredApps.flatMap((app) => app.files);
  const isFiltered = debouncedSearch.trim().length > 0 || envFilter !== ALL_ENVIRONMENTS;

  const activeFileId = visibleFiles.some((f) => f.id === selectedFileId)
    ? selectedFileId
    : (visibleFiles[0]?.id ?? null);

  return (
    <Stack spacing={2}>
      <RepoSummaryStrip apps={apps} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ overflow: "hidden", position: "sticky", top: 16 }}>
            <RepoExplorerToolbar
              search={search}
              onSearchChange={setSearch}
              environments={environments}
              envFilter={envFilter}
              onEnvFilterChange={setEnvFilter}
              actions={
                <VaultExportMenu projectId={projectId} projectName={projectName} apps={apps} />
              }
            />
            <RepoTree
              apps={filteredApps}
              selectedFileId={activeFileId}
              onSelectFile={setSelectedFileId}
              expandAll={isFiltered}
            />
          </Paper>
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
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="body2Muted">No file selected.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Stack>
  );
}
