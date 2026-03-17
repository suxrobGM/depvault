"use client";

import { useState, type ReactElement } from "react";
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Replay as ReplayIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import {
  Box,
  Collapse,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CreateFileShareDialog } from "@/components/features/shared-secret/create-file-share-dialog";
import { ActionMenu } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
import type {
  SecretFile,
  SecretFileVersion,
  SecretFileVersionListResponse,
} from "@/types/api/secret-file";
import { downloadFile } from "@/utils/download-file";
import { formatBytes, formatDate } from "@/utils/formatters";

export interface SecretFileRowProps {
  projectId: string;
  file: SecretFile;
  canEdit: boolean;
  onEdit: (file: SecretFile) => void;
}

export function SecretFileRow(props: SecretFileRowProps): ReactElement {
  const { projectId, file, canEdit, onEdit } = props;

  const confirm = useConfirm();
  const toast = useToast();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null);

  const { data: versionsData, isLoading: versionsLoading } =
    useApiQuery<SecretFileVersionListResponse>(
      ["secret-file-versions", projectId, file.id],
      () => client.api.projects({ id: projectId }).secrets({ fileId: file.id }).versions.get(),
      { enabled: historyOpen },
    );

  const deleteMutation = useApiMutation(
    () => client.api.projects({ id: projectId }).secrets({ fileId: file.id }).delete(),
    {
      invalidateKeys: [["secret-files", projectId]],
      successMessage: "File deleted",
    },
  );

  const rollbackMutation = useApiMutation(
    (versionId: string) =>
      client.api
        .projects({ id: projectId })
        .secrets({ fileId: file.id })
        .rollback({ versionId })
        .post(),
    {
      invalidateKeys: [
        ["secret-files", projectId],
        ["secret-file-versions", projectId, file.id],
      ],
      successMessage: "File rolled back successfully",
    },
  );

  const handleDownload = async () => {
    setDownloading(true);

    const { data, error } = await client.api
      .projects({ id: projectId })
      .secrets({ fileId: file.id })
      .download.get();

    if (error) {
      toast.error("Failed to download file");
      setDownloading(false);
      return;
    }

    downloadFile(data as unknown as ArrayBuffer, file.name);
    setDownloading(false);
  };

  const handleVersionDownload = async (versionId: string) => {
    setDownloadingVersionId(versionId);

    const { data, error } = await client.api
      .projects({ id: projectId })
      .secrets({ fileId: file.id })
      .versions({ versionId })
      .download.get();

    if (error) {
      toast.error("Failed to download version");
      setDownloadingVersionId(null);
      return;
    }

    downloadFile(data as unknown as ArrayBuffer, file.name);
    setDownloadingVersionId(null);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Secret File",
      description: `Are you sure you want to permanently delete "${file.name}"? All version history will also be deleted.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  const versions: SecretFileVersion[] = versionsData?.items ?? [];

  return (
    <>
      <TableRow sx={{ "& > *": { borderBottom: historyOpen ? "unset" : undefined } }}>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label="toggle version history"
          >
            {historyOpen ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={500}>
            {file.name}
          </Typography>
          {file.description && (
            <Typography variant="caption" color="text.secondary">
              {file.description}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {file.vaultGroupName}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {formatBytes(file.fileSize)}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {formatDate(file.createdAt)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <ActionMenu
            disabled={downloading}
            items={[
              {
                label: downloading ? "Downloading..." : "Download",
                icon: <DownloadIcon fontSize="small" />,
                onClick: handleDownload,
                disabled: downloading,
                hidden: !canEdit,
              },
              {
                label: "Share",
                icon: <ShareIcon fontSize="small" />,
                onClick: () => setShareOpen(true),
                hidden: !canEdit,
              },
              {
                label: "Edit",
                icon: <EditIcon fontSize="small" />,
                onClick: () => onEdit(file),
                hidden: !canEdit,
              },
              {
                label: "Version History",
                icon: <HistoryIcon fontSize="small" />,
                onClick: () => setHistoryOpen(true),
              },
              {
                label: "Delete",
                icon: <DeleteIcon fontSize="small" />,
                onClick: handleDelete,
                hidden: !canEdit,
                destructive: true,
              },
            ]}
          />
        </TableCell>
      </TableRow>

      <CreateFileShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={projectId}
        file={file}
      />

      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={historyOpen} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 6, pr: 2 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <HistoryIcon fontSize="small" />
                Version History
              </Typography>
              {versionsLoading ? (
                <Skeleton variant="rounded" height={60} />
              ) : versions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No previous versions.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Version</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {versions.map((v, idx) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Typography variant="body2">v{versions.length - idx}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(v.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatBytes(v.fileSize)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            title="Download this version"
                            disabled={downloadingVersionId === v.id}
                            onClick={() => handleVersionDownload(v.id)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                          {canEdit && (
                            <IconButton
                              size="small"
                              title="Rollback to this version"
                              disabled={rollbackMutation.isPending}
                              onClick={() => rollbackMutation.mutate(v.id)}
                            >
                              <ReplayIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
