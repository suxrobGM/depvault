"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, Code as CodeIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ActionMenu } from "@/components/ui/action-menu";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { CiToken, CiTokenListResponse } from "@/types/api/ci-token";
import { formatDateTime } from "@/utils/formatters";
import { CiTokenUsageSnippets } from "./ci-token-usage-snippets";
import { CreateCiTokenDialog } from "./create-ci-token-dialog";

interface CiTokensSectionProps {
  projectId: string;
  canEdit: boolean;
}

function getTokenStatus(token: CiToken): { label: string; color: "success" | "error" | "warning" } {
  if (token.revokedAt) {
    return { label: "Revoked", color: "error" };
  }
  if (new Date(token.expiresAt) < new Date()) {
    return { label: "Expired", color: "warning" };
  }
  return { label: "Active", color: "success" };
}

export function CiTokensSection(props: CiTokensSectionProps): ReactElement {
  const { projectId, canEdit } = props;
  const confirm = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);

  const { data } = useApiQuery<CiTokenListResponse>(["ci-tokens", projectId], () =>
    client.api.projects({ id: projectId })["ci-tokens"].get({ query: { page: 1, limit: 100 } }),
  );

  const revokeMutation = useApiMutation(
    (tokenId: string) => client.api.projects({ id: projectId })["ci-tokens"]({ tokenId }).delete(),
    {
      invalidateKeys: [["ci-tokens", projectId]],
      successMessage: "CI token revoked",
      errorMessage: "Failed to revoke token",
    },
  );

  const tokens = data?.items ?? [];

  const revokeToken = async (token: CiToken) => {
    const ok = await confirm({
      title: "Revoke CI Token",
      description: `Are you sure you want to revoke "${token.name}"? Any pipelines using this token will immediately lose access.`,
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (ok) {
      revokeMutation.mutate(token.id);
    }
  };

  return (
    <>
      <GlassCard>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                CI/CD Tokens
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate scoped tokens for CI/CD pipelines to fetch secrets at build time.
              </Typography>
            </Box>
            {canEdit && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
              >
                Generate Token
              </Button>
            )}
          </Stack>

          {tokens.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
              No CI/CD tokens yet. Generate one to get started.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Token</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tokens.map((token) => {
                    const status = getTokenStatus(token);
                    return (
                      <TableRow key={token.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {token.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                            dvci_{token.tokenPrefix}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{token.environmentLabel}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDateTime(token.expiresAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(token.lastUsedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={status.label} color={status.color} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <ActionMenu
                            items={[
                              {
                                label: "Integration code",
                                icon: <CodeIcon fontSize="small" />,
                                onClick: () => setSnippetsOpen(true),
                              },
                              {
                                label: "Revoke",
                                icon: <DeleteIcon fontSize="small" />,
                                onClick: () => revokeToken(token),
                                destructive: true,
                                dividerBefore: true,
                                hidden: !canEdit || !!token.revokedAt,
                              },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>

      <CreateCiTokenDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
      />

      <Dialog open={snippetsOpen} onClose={() => setSnippetsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Integration Code</DialogTitle>
        <DialogContent>
          <CiTokenUsageSnippets />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnippetsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
