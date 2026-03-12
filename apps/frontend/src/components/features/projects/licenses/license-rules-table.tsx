"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import type { LicenseRuleListResponse } from "@/types/api/license-rule";

interface LicenseRulesTableProps {
  projectId: string;
  canEdit: boolean;
}

const POLICY_OPTIONS = ["ALLOW", "WARN", "BLOCK"] as const;

const POLICY_COLOR: Record<string, "success" | "warning" | "error"> = {
  ALLOW: "success",
  WARN: "warning",
  BLOCK: "error",
};

export function LicenseRulesTable(props: LicenseRulesTableProps): ReactElement {
  const { projectId, canEdit } = props;
  const confirm = useConfirm();
  const [newLicenseId, setNewLicenseId] = useState("");
  const [newPolicy, setNewPolicy] = useState<(typeof POLICY_OPTIONS)[number]>("WARN");

  const { data } = useApiQuery<LicenseRuleListResponse>(["license-rules", projectId], () =>
    client.api.projects({ id: projectId })["license-rules"].get(),
  );

  const createMutation = useApiMutation(
    (body: { licenseId: string; policy: (typeof POLICY_OPTIONS)[number] }) =>
      client.api.projects({ id: projectId })["license-rules"].post(body),
    {
      invalidateKeys: [["license-rules", projectId]],
      successMessage: "License rule created",
    },
  );

  const updateMutation = useApiMutation(
    ({ ruleId, policy }: { ruleId: string; policy: (typeof POLICY_OPTIONS)[number] }) =>
      client.api.projects({ id: projectId })["license-rules"]({ ruleId }).put({ policy }),
    {
      invalidateKeys: [["license-rules", projectId]],
      successMessage: "License rule updated",
    },
  );

  const deleteMutation = useApiMutation(
    (ruleId: string) =>
      client.api.projects({ id: projectId })["license-rules"]({ ruleId }).delete(),
    {
      invalidateKeys: [["license-rules", projectId]],
      successMessage: "License rule deleted",
    },
  );

  const handleCreate = () => {
    if (!newLicenseId.trim()) return;
    createMutation.mutate({ licenseId: newLicenseId.trim(), policy: newPolicy });
    setNewLicenseId("");
    setNewPolicy("WARN");
  };

  const handleDelete = async (ruleId: string, licenseId: string) => {
    const confirmed = await confirm({
      title: "Delete License Rule",
      description: `Remove the policy rule for "${licenseId}"? The default policy will apply instead.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) deleteMutation.mutate(ruleId);
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        License Policy Rules
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Override the default policy for specific SPDX license identifiers. Defaults: permissive
        (MIT, Apache-2.0, BSD) = Allow; copyleft (GPL, AGPL) = Warn; unknown = Warn.
      </Typography>

      <TableContainer
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: (t) => alpha(t.palette.background.paper, 0.3),
          backdropFilter: "blur(8px)",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>License (SPDX ID)</TableCell>
              <TableCell sx={{ width: 150 }}>Policy</TableCell>
              {canEdit && <TableCell sx={{ width: 60 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.items.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {rule.licenseId}
                  </Typography>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <TextField
                      select
                      size="small"
                      value={rule.policy}
                      onChange={(e) =>
                        updateMutation.mutate({
                          ruleId: rule.id,
                          policy: e.target.value as (typeof POLICY_OPTIONS)[number],
                        })
                      }
                      sx={{ minWidth: 110 }}
                    >
                      {POLICY_OPTIONS.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Chip
                      label={rule.policy}
                      size="small"
                      color={POLICY_COLOR[rule.policy]}
                      variant="outlined"
                    />
                  )}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <Tooltip title="Delete rule">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(rule.id, rule.licenseId)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!data || data.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={canEdit ? 3 : 2}>
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    sx={{ py: 2, textAlign: "center" }}
                  >
                    No custom rules. Default policies are applied.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {canEdit && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
          <TextField
            size="small"
            placeholder="e.g. GPL-3.0"
            value={newLicenseId}
            onChange={(e) => setNewLicenseId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            sx={{ width: 200 }}
          />
          <TextField
            select
            size="small"
            value={newPolicy}
            onChange={(e) => setNewPolicy(e.target.value as (typeof POLICY_OPTIONS)[number])}
            sx={{ width: 120 }}
          >
            {POLICY_OPTIONS.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            disabled={!newLicenseId.trim() || createMutation.isPending}
          >
            Add Rule
          </Button>
        </Stack>
      )}
    </Box>
  );
}
