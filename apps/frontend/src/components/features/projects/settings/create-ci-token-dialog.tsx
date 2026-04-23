"use client";

import { useState, type ReactElement } from "react";
import { Key as KeyIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormDateField, FormSelectField, FormTextField } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { deriveCIWrapKey, exportDEK, wrapKey } from "@/lib/crypto";
import type { CiTokenCreatedResponse, CreateCiTokenBody } from "@/types/api/ci-token";
import type { VaultListResponse } from "@/types/api/vault";
import { CiTokenUsageSnippets } from "./ci-token-usage-snippets";

const CUSTOM_VALUE = -1;

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "30 days", value: 2592000 },
  { label: "90 days", value: 7776000 },
  { label: "1 year", value: 31536000 },
  { label: "Custom", value: CUSTOM_VALUE },
];

function getMaxCustomDate(): string {
  const max = new Date();
  max.setFullYear(max.getFullYear() + 1);
  return max.toISOString().split("T")[0]!;
}

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0]!;
}

interface CreateCiTokenDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateCiTokenDialog(props: CreateCiTokenDialogProps): ReactElement {
  const { open, onClose, projectId } = props;
  const { getProjectDEK, isVaultUnlocked } = useVault();
  const [createdToken, setCreatedToken] = useState<CiTokenCreatedResponse | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);

  const { data: vaults } = useApiQuery<VaultListResponse>(["vaults", projectId], () =>
    client.api.projects({ id: projectId }).vaults.get(),
  );

  const vaultItems = (vaults ?? []).map((vault) => ({
    value: vault.id,
    label: vault.name,
  }));

  const mutation = useApiMutation(
    (values: CreateCiTokenBody) => client.api.projects({ id: projectId })["ci-tokens"].post(values),
    {
      invalidateKeys: [["ci-tokens", projectId]],
      errorMessage: "Failed to create CI token",
    },
  );

  const form = useForm({
    defaultValues: {
      name: "",
      vaultId: "",
      expiresIn: 86400 as number,
      customDate: "",
      ipAllowlistText: "",
    },
    onSubmit: async ({ value }) => {
      const ipAllowlist = value.ipAllowlistText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      let expiresIn = value.expiresIn;
      if (expiresIn === CUSTOM_VALUE) {
        const diffMs = new Date(value.customDate).getTime() - Date.now();
        expiresIn = Math.max(3600, Math.ceil(diffMs / 1000));
      }

      const dek = await getProjectDEK(projectId);
      const dekBytes = await exportDEK(dek);

      // Wrap DEK with a placeholder key — backend re-wraps with the real token-derived key
      const placeholder = "placeholder";
      const placeholderKey = await deriveCIWrapKey(placeholder);
      const wrapped = await wrapKey(dekBytes, placeholderKey);

      const created = await mutation.mutateAsync({
        name: value.name,
        vaultId: value.vaultId,
        expiresIn,
        wrappedDek: wrapped.wrapped,
        wrappedDekIv: wrapped.iv,
        wrappedDekTag: wrapped.tag,
        wrapPlaceholder: placeholder,
        ...(ipAllowlist.length > 0 && { ipAllowlist }),
      });

      setCreatedToken(created);
    },
  });

  const handleClose = () => {
    setCreatedToken(null);
    setShowSnippets(false);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <KeyIcon fontSize="small" />
        Generate CI/CD Token
      </DialogTitle>
      <DialogContent>
        {!isVaultUnlocked ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Unlock your vault before generating a CI token.
          </Alert>
        ) : createdToken ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">Copy this token now. It will not be shown again.</Alert>
            <Box
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.8rem",
                wordBreak: "break-all",
                bgcolor: "action.hover",
              }}
            >
              {createdToken.token}
            </Box>
            <CopyButton
              value={createdToken.token}
              label="Copy Token"
              notification="Token copied to clipboard"
              fullWidth
            />
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Expires: {new Date(createdToken.expiresAt).toLocaleString()}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowSnippets(!showSnippets)}
              sx={{ alignSelf: "flex-start" }}
            >
              {showSnippets ? "Hide" : "Show"} integration examples
            </Button>
            <Collapse in={showSnippets}>
              <CiTokenUsageSnippets />
            </Collapse>
          </Stack>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <FormTextField form={form} name="name" label="Token Name" autoFocus />
              <FormSelectField
                form={form}
                name="vaultId"
                label="Vault"
                items={vaultItems}
                emptyMessage="No vaults found. Create a vault first."
              />
              <FormSelectField
                form={form}
                name="expiresIn"
                label="Expires after"
                items={EXPIRY_OPTIONS}
              />
              <form.Subscribe selector={(state) => state.values.expiresIn}>
                {(expiresIn) =>
                  expiresIn === CUSTOM_VALUE && (
                    <FormDateField
                      form={form}
                      name="customDate"
                      label="Expiration date"
                      min={getTomorrowDate()}
                      max={getMaxCustomDate()}
                    />
                  )
                }
              </form.Subscribe>
              <FormTextField
                form={form}
                name="ipAllowlistText"
                label="IP Allowlist (optional)"
                placeholder={"10.0.0.1\n192.168.1.0/24"}
                multiline
                rows={3}
              />
            </Stack>
            <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? "Generating..." : "Generate Token"}
              </Button>
            </DialogActions>
          </form>
        )}
      </DialogContent>
      {(createdToken || !isVaultUnlocked) && (
        <DialogActions>
          <Button onClick={handleClose}>{createdToken ? "Done" : "Close"}</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
