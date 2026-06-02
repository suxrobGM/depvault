"use client";

import { useState, type ReactElement } from "react";
import { decrypt } from "@depvault/crypto";
import {
  CompareArrows as CompareIcon,
  History as HistoryIcon,
  Replay as ReplayIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  RepoFileVersionContentDto,
  RepoFileVersionDto,
  RepoFileVersionListResponseDto,
} from "@/types/api/repo";
import { formatBytes, formatDateTime } from "@/utils/formatters";
import { FileDiffViewerLazy } from "./code-editor-lazy";
import { binaryPlaceholder } from "./file-format";

interface FileVersionsProps {
  projectId: string;
  fileId: string;
  /** Current decrypted text, used as the right-hand side of a "compare with current" diff. */
  currentText: string | null;
  currentIsBinary: boolean;
  canEdit: boolean;
}

interface DiffState {
  versionLabel: string;
  oldText: string;
  newText: string;
}

export function FileVersions(props: FileVersionsProps): ReactElement {
  const { projectId, fileId, currentText, currentIsBinary, canEdit } = props;
  const { getProjectDEK } = useVault();

  const [diff, setDiff] = useState<DiffState | null>(null);
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);

  const { data, isLoading } = useApiQuery<RepoFileVersionListResponseDto>(
    queryKeys.repo.fileVersions(projectId, fileId),
    () => client.api.projects({ id: projectId }).files({ fileId }).versions.get(),
  );

  const restoreMutation = useApiMutation(
    (versionId: string) =>
      client.api
        .projects({ id: projectId })
        .files({ fileId })
        .versions({ versionId })
        .restore.post(),
    {
      invalidateKeys: [
        queryKeys.repo.file(projectId, fileId),
        queryKeys.repo.fileContent(projectId, fileId),
        queryKeys.repo.fileVersions(projectId, fileId),
        queryKeys.repo.map(projectId),
      ],
      successMessage: "File restored to selected version",
    },
  );

  const versions: RepoFileVersionDto[] = data?.items ?? [];

  const handleCompare = async (version: RepoFileVersionDto, label: string) => {
    if (version.isBinary || currentIsBinary) {
      setDiff({
        versionLabel: label,
        oldText: binaryPlaceholder(version.fileSize),
        newText: currentIsBinary ? "Binary file (current)" : (currentText ?? ""),
      });
      return;
    }

    setLoadingVersionId(version.id);
    const { data: content, error } = await client.api
      .projects({ id: projectId })
      .files({ fileId })
      .versions({ versionId: version.id })
      .get();

    if (error || !content) {
      setLoadingVersionId(null);
      return;
    }

    try {
      const dek = await getProjectDEK(projectId);
      const versionContent = content as RepoFileVersionContentDto;
      const oldText = await decrypt(
        versionContent.encryptedContent,
        versionContent.iv,
        versionContent.authTag,
        dek,
      );
      setDiff({ versionLabel: label, oldText, newText: currentText ?? "" });
    } catch {
      // Decryption failures are surfaced silently here; the diff panel just won't open.
    } finally {
      setLoadingVersionId(null);
    }
  };

  if (isLoading) {
    return <Skeleton variant="rounded" height={120} />;
  }

  if (versions.length === 0) {
    return <Typography variant="body2Muted">No previous versions yet.</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <HistoryIcon fontSize="small" />
        Version History
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Version</TableCell>
            <TableCell>Message</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {versions.map((version, idx) => {
            const label = `v${versions.length - idx}`;
            return (
              <TableRow key={version.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {label}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{version.message || "—"}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{formatBytes(version.fileSize)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{formatDateTime(version.createdAt)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<CompareIcon fontSize="small" />}
                    disabled={loadingVersionId === version.id}
                    onClick={() => handleCompare(version, label)}
                  >
                    Compare
                  </Button>
                  {canEdit && (
                    <Button
                      size="small"
                      startIcon={<ReplayIcon fontSize="small" />}
                      disabled={restoreMutation.isPending}
                      onClick={() => restoreMutation.mutate(version.id)}
                    >
                      Restore
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {diff && (
        <Box>
          <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
            Comparing {diff.versionLabel} → current
          </Typography>
          <FileDiffViewerLazy
            oldValue={diff.oldText}
            newValue={diff.newText}
            oldTitle={diff.versionLabel}
            newTitle="Current"
          />
        </Box>
      )}
    </Stack>
  );
}
