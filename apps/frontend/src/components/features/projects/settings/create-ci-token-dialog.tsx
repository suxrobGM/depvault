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
import { CopyButton } from "@/components/ui/copy-button";
import { FormDateField } from "@/components/ui/form-date-field";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { CiTokenCreatedResponse, CreateCiTokenBody } from "@/types/api/ci-token";
import type { EnvironmentListResponse } from "@/types/api/environment";
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
  const [createdToken, setCreatedToken] = useState<CiTokenCreatedResponse | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);

  const { data: environments } = useApiQuery<EnvironmentListResponse>(
    ["environments", projectId],
    () => client.api.projects({ id: projectId }).environments.get(),
  );

  const environmentItems = (environments ?? []).map((env) => ({
    value: env.id,
    label: `${env.vaultGroupName} / ${env.type}`,
  }));

  const mutation = useApiMutation(
    (values: CreateCiTokenBody) => client.api.projects({ id: projectId })["ci-tokens"].post(values),
    {
      invalidateKeys: [["ci-tokens", projectId]],
      onSuccess: (data) => {
        setCreatedToken(data);
      },
      errorMessage: "Failed to create CI token",
    },
  );

  const form = useForm({
    defaultValues: {
      name: "",
      environmentId: "",
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

      await mutation.mutateAsync({
        name: value.name,
        environmentId: value.environmentId,
        expiresIn,
        ...(ipAllowlist.length > 0 && { ipAllowlist }),
      });
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
        {createdToken ? (
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
            <Typography variant="caption" color="text.secondary">
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
                name="environmentId"
                label="Environment"
                items={environmentItems}
                emptyMessage="No environments found. Create a vault group first."
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
      {createdToken && (
        <DialogActions>
          <Button onClick={handleClose}>Done</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
