"use client";

import { useState, type ReactElement } from "react";
import type { SecretFileEnvironmentTypeValue } from "@depvault/shared/constants";
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  Replay as ReplayIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/lib/api";
import type {
  SecretFile,
  SecretFileVersion,
  SecretFileVersionListResponse,
} from "@/types/api/secret-file";
import { downloadFile } from "@/utils/download-file";

interface SecretFileTableProps {
  projectId: string;
  files: SecretFile[];
  activeEnv: SecretFileEnvironmentTypeValue;
  canEdit: boolean;
  onEdit: (file: SecretFile) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ENV_COLORS: Record<string, "default" | "success" | "warning" | "error"> = {
  GLOBAL: "default",
  DEVELOPMENT: "success",
  STAGING: "warning",
  PRODUCTION: "error",
};

interface SecretFileRowProps {
  projectId: string;
  file: SecretFile;
  activeEnv: SecretFileEnvironmentTypeValue;
  canEdit: boolean;
  onEdit: (file: SecretFile) => void;
  onDeleted: () => void;
}

function SecretFileRow(props: SecretFileRowProps): ReactElement {
  const { projectId, file, activeEnv, canEdit, onEdit, onDeleted } = props;

  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const toast = useToast();

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
      onSuccess: onDeleted,
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
    setMenuAnchor(null);
    try {
      const { data, error } = await client.api
        .projects({ id: projectId })
        .secrets({ fileId: file.id })
        .download.get();

      if (error) {
        toast.error("Failed to download file");
        return;
      }

      const blob = new Blob([data as unknown as ArrayBuffer], { type: "application/octet-stream" });
      downloadFile(blob, file.name);
    } catch {
      toast.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
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
        {activeEnv && (
          <TableCell>
            <Chip
              label={activeEnv}
              size="small"
              color={ENV_COLORS[activeEnv] ?? "default"}
              variant="outlined"
            />
          </TableCell>
        )}
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
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            disabled={downloading}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            {canEdit && (
              <MenuItem onClick={handleDownload} disabled={downloading}>
                <ListItemIcon>
                  <DownloadIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{downloading ? "Downloading..." : "Download"}</ListItemText>
              </MenuItem>
            )}
            {canEdit && (
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onEdit(file);
                }}
              >
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setHistoryOpen(true);
              }}
            >
              <ListItemIcon>
                <HistoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Version History</ListItemText>
            </MenuItem>
            {canEdit && (
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setDeleteOpen(true);
                }}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon sx={{ color: "error.main" }}>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={activeEnv ? 6 : 5} sx={{ py: 0 }}>
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
                      {canEdit && <TableCell align="right">Action</TableCell>}
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
                        {canEdit && (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              title="Rollback to this version"
                              disabled={rollbackMutation.isPending}
                              onClick={() => rollbackMutation.mutate(v.id)}
                            >
                              <ReplayIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Secret File"
        description={`Are you sure you want to permanently delete "${file.name}"? All version history will also be deleted.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

export function SecretFileTable(props: SecretFileTableProps): ReactElement {
  const { projectId, files, activeEnv, canEdit, onEdit } = props;
  const queryClient = useQueryClient();

  const handleDeleted = () => {
    void queryClient.invalidateQueries({ queryKey: ["secret-files", projectId] });
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width={48} />
            <TableCell>File</TableCell>
            {activeEnv && <TableCell>Environment</TableCell>}
            <TableCell>Size</TableCell>
            <TableCell>Uploaded</TableCell>
            <TableCell width={64} />
          </TableRow>
        </TableHead>
        <TableBody>
          {files.map((file) => (
            <SecretFileRow
              key={file.id}
              projectId={projectId}
              file={file}
              activeEnv={activeEnv}
              canEdit={canEdit}
              onEdit={onEdit}
              onDeleted={handleDeleted}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
