"use client";

import { useState, type ReactElement } from "react";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import {
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CreateFileShareDialog,
  type ShareableFile,
} from "@/components/features/shared-secret/create-file-share-dialog";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useConfirm } from "@/hooks/use-confirm";
import { useToast } from "@/hooks/use-toast";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { decryptBinary } from "@/lib/crypto";
import { queryKeys } from "@/lib/query-keys";
import type { RepoMapAppDto, RepoMapSecretFileDto } from "@/types/api/repo";
import { downloadFile } from "@/utils/download-file";
import { formatBytes, formatDateTime } from "@/utils/formatters";
import { SecretFileEditorDialog } from "./secret-file-editor-dialog";

interface SecretFilesPanelProps {
  projectId: string;
  app: RepoMapAppDto;
  files: RepoMapSecretFileDto[];
  canEdit: boolean;
}

export function SecretFilesPanel(props: SecretFilesPanelProps): ReactElement {
  const { projectId, app, files, canEdit } = props;
  const { getProjectDEK } = useVault();
  const toast = useToast();
  const confirm = useConfirm();

  const [editFile, setEditFile] = useState<RepoMapSecretFileDto | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<ShareableFile | null>(null);

  const deleteMutation = useApiMutation(
    (fileId: string) => client.api.projects({ id: projectId }).secrets({ fileId }).delete(),
    {
      invalidateKeys: [queryKeys.repo.map(projectId), queryKeys.secretFiles.byProject(projectId)],
      successMessage: "Secret file deleted",
    },
  );

  const handleDownload = async (file: RepoMapSecretFileDto) => {
    setDownloadingId(file.id);
    const { data, error } = await client.api
      .projects({ id: projectId })
      .secrets({ fileId: file.id })
      .download.get();

    if (error || !data) {
      toast.error("Failed to download secret file");
      setDownloadingId(null);
      return;
    }

    try {
      const dek = await getProjectDEK(projectId);
      const buffer = await decryptBinary(data.encryptedContent, data.iv, data.authTag, dek);
      const fileName = file.relativePath.split("/").pop() ?? file.relativePath;
      downloadFile(buffer, fileName, file.mimeType || "application/octet-stream");
    } catch {
      toast.error("Failed to decrypt secret file");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = async (file: RepoMapSecretFileDto) => {
    setSharingId(file.id);
    const { data, error } = await client.api
      .projects({ id: projectId })
      .secrets({ fileId: file.id })
      .download.get();

    if (error || !data) {
      toast.error("Failed to load secret file");
      setSharingId(null);
      return;
    }

    try {
      const dek = await getProjectDEK(projectId);
      const buffer = await decryptBinary(data.encryptedContent, data.iv, data.authTag, dek);
      const fileName = file.relativePath.split("/").pop() ?? file.relativePath;
      setShareFile({
        fileName,
        mimeType: file.mimeType || "application/octet-stream",
        content: buffer,
      });
    } catch {
      toast.error("Failed to decrypt secret file");
    } finally {
      setSharingId(null);
    }
  };

  const handleDelete = async (file: RepoMapSecretFileDto) => {
    const ok = await confirm({
      title: "Delete secret file",
      description: `Permanently delete "${file.relativePath}" and all its version history?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteMutation.mutate(file.id);
  };

  if (files.length === 0) {
    return <Typography variant="body2Muted">No secret files in this app.</Typography>;
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                    <LockIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                      {file.relativePath}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{file.environmentSlug ?? "—"}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{file.mimeType}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{formatBytes(file.fileSize)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2Muted">{formatDateTime(file.updatedAt)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Download">
                    <span>
                      <IconButton
                        size="small"
                        disabled={downloadingId === file.id}
                        onClick={() => handleDownload(file)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Share via link">
                    <span>
                      <IconButton
                        size="small"
                        disabled={sharingId === file.id}
                        onClick={() => handleShare(file)}
                      >
                        <ShareIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {canEdit && !file.isBinary && (
                    <Tooltip title="Edit raw text">
                      <IconButton size="small" onClick={() => setEditFile(file)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Tooltip title="Delete">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(file)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editFile && (
        <SecretFileEditorDialog
          open={!!editFile}
          onClose={() => setEditFile(null)}
          projectId={projectId}
          app={app}
          file={editFile}
        />
      )}

      {shareFile && (
        <CreateFileShareDialog
          open={!!shareFile}
          onClose={() => setShareFile(null)}
          projectId={projectId}
          file={shareFile}
        />
      )}
    </>
  );
}
