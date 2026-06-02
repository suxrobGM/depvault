"use client";

import { type ReactElement } from "react";
import { Delete as DeleteIcon, Link as LinkIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ShareLinkItemDto, ShareLinkListResponseDto } from "@/types/api/share-link";
import { formatDate } from "@/utils/formatters";

const STATUS_COLOR: Record<string, "warning" | "success" | "error" | "default"> = {
  PENDING: "warning",
  VIEWED: "success",
  EXPIRED: "error",
};

interface ShareLinksDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function ShareLinksDialog(props: ShareLinksDialogProps): ReactElement {
  const { open, onClose, projectId } = props;
  const confirm = useConfirm();

  const { data, isLoading } = useApiQuery<ShareLinkListResponseDto>(
    queryKeys.shareLinks.byProject(projectId),
    () => client.api.projects({ id: projectId }).shares.get(),
    { enabled: open },
  );

  const revokeMutation = useApiMutation(
    (shareId: string) => client.api.projects({ id: projectId }).shares({ shareId }).delete(),
    {
      invalidateKeys: [queryKeys.shareLinks.byProject(projectId)],
      successMessage: "Link revoked",
    },
  );

  const handleRevoke = async (item: ShareLinkItemDto) => {
    const ok = await confirm({
      title: "Revoke Share Link",
      description:
        "This will permanently delete the share link. The recipient will no longer be able to access it.",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (ok) {
      revokeMutation.mutate(item.id);
    }
  };

  const items = data?.items ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinkIcon
          sx={{
            fontSize: "small",
          }}
        />
        Share Links
      </DialogTitle>
      <DialogContent sx={{ px: 0, pb: 0 }}>
        {isLoading ? (
          <Box sx={{ px: 3, py: 2 }}>
            <Skeleton variant="rounded" height={200} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
            <Typography variant="body1Muted">No share links created yet.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>File / Token</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Protected</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Viewed</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      {item.fileName ?? item.token.slice(0, 16) + "…"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={STATUS_COLOR[item.status] ?? "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2Muted">{item.hasPassword ? "Yes" : "No"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2Muted">{formatDate(item.expiresAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2Muted">
                      {item.viewedAt ? formatDate(item.viewedAt) : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2Muted">{formatDate(item.createdAt)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {item.status === "PENDING" && (
                      <Tooltip title="Revoke link">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={revokeMutation.isPending}
                          onClick={() => handleRevoke(item)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
