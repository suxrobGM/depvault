"use client";

import { useState, type ReactElement } from "react";
import { Link as LinkIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { CopyButton } from "@/components/ui/copy-button";
import { FormCheckboxField } from "@/components/ui/form-checkbox-field";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { EnvVariable } from "@/types/api/env-variable";

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
];

interface CreateShareLinkDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  variables: EnvVariable[];
}

export function CreateShareLinkDialog(props: CreateShareLinkDialogProps): ReactElement {
  const { open, onClose, projectId, variables } = props;
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useApiMutation(
    (values: { variableIds: string[]; expiresIn: number; password?: string }) =>
      client.api.projects({ id: projectId })["secrets"]["shared"]["env"].post(values),
    {
      onSuccess: (data) => {
        setShareUrl(data.shareUrl);
      },
      errorMessage: "Failed to create share link",
    },
  );

  const form = useForm({
    defaultValues: {
      expiresIn: 86400,
      password: "",
      usePassword: false,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        variableIds: variables.map((v) => v.id),
        expiresIn: value.expiresIn,
        password: value.usePassword && value.password ? value.password : undefined,
      });
    },
  });

  const handleClose = () => {
    setShareUrl(null);
    setShowPassword(false);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinkIcon fontSize="small" />
        Share Secret
      </DialogTitle>
      <DialogContent>
        {shareUrl ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">
              Link created! Share it with the recipient. This link can only be accessed once.
            </Alert>
            <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
              The content will be permanently destroyed after first access.
            </Alert>
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
              {shareUrl}
            </Box>
            <CopyButton
              value={shareUrl}
              label="Copy Link"
              notification="Link copied to clipboard"
              fullWidth
            />
          </Stack>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "action.hover",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {variables.length === 1
                    ? "Sharing variable"
                    : `Sharing ${variables.length} variables`}
                </Typography>
                {variables.length === 1 ? (
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                    {variables[0]?.key}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight={600}
                    sx={{ maxHeight: 80, overflow: "auto" }}
                  >
                    {variables.map((v) => v.key).join(", ")}
                  </Typography>
                )}
              </Box>

              <FormSelectField
                form={form}
                name="expiresIn"
                label="Link expires after"
                items={EXPIRY_OPTIONS}
                labelPlacement="above"
              />

              <FormCheckboxField
                form={form}
                name="usePassword"
                label="Password protect this link"
                onChange={setShowPassword}
              />

              {showPassword && (
                <FormTextField
                  form={form}
                  name="password"
                  label="Password"
                  type="password"
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">🔒</InputAdornment>,
                    },
                  }}
                />
              )}

              <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
                The recipient sees the value once. The link self-destructs after access.
              </Alert>
            </Stack>
            <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={mutation.isPending}>
                {mutation.isPending ? "Generating..." : "Generate Link"}
              </Button>
            </DialogActions>
          </form>
        )}
      </DialogContent>
      {shareUrl && (
        <DialogActions>
          <Button onClick={handleClose}>Done</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
