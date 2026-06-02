"use client";

import { useState, type ReactElement } from "react";
import { Share as ShareIcon } from "@mui/icons-material";
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
import { FormCheckboxField, FormSelectField, FormTextField } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import { encryptBinary, generateShareKey, shareKeyToFragment } from "@/lib/crypto";
import type { CreateShareBody } from "@/types/api/share-link";

const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
];

/** The plaintext file the caller has already decrypted with the project DEK. */
export interface ShareableFile {
  fileName: string;
  mimeType: string;
  content: string | ArrayBuffer;
}

interface CreateFileShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  file: ShareableFile;
}

export function CreateFileShareDialog(props: CreateFileShareDialogProps): ReactElement {
  const { open, onClose, projectId, file } = props;
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useApiMutation(
    (values: CreateShareBody) => client.api.projects({ id: projectId }).shares.post(values),
    {
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
      // Encrypt the already-decrypted file content with a fresh ephemeral key.
      const fileData =
        typeof file.content === "string"
          ? (new TextEncoder().encode(file.content).buffer as ArrayBuffer)
          : file.content;

      const shareKey = await generateShareKey();
      const encrypted = await encryptBinary(fileData, shareKey.key);

      const result = await mutation.mutateAsync({
        fileName: file.fileName,
        encryptedPayload: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        mimeType: file.mimeType,
        expiresIn: value.expiresIn,
        password: value.usePassword && value.password ? value.password : undefined,
      });

      const fragment = shareKeyToFragment(shareKey.raw);
      setShareUrl(`${result.shareUrl}#${fragment}`);
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
        <ShareIcon fontSize="small" />
        Share File
      </DialogTitle>
      <DialogContent>
        {shareUrl ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">
              Link created! Share it with the recipient. This link can only be accessed once.
            </Alert>
            <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
              The file will be permanently inaccessible via this link after first access.
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
                <Typography variant="captionMuted">Sharing file</Typography>
                <Typography variant="label">{file.fileName}</Typography>
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
                Recipient accesses the file once. The link self-destructs after access.
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
