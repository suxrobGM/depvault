"use client";

import { useEffect, useState, type ReactElement } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { decrypt, encrypt } from "@/lib/crypto";
import { queryKeys } from "@/lib/query-keys";
import type { RepoMapAppDto, RepoMapSecretFileDto } from "@/types/api/repo";
import { CodeEditorLazy } from "./code-editor-lazy";

interface SecretFileEditorDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  app: RepoMapAppDto;
  file: RepoMapSecretFileDto;
}

/**
 * Raw-text editor for a plaintext secret file. Saving re-encrypts the full text and
 * re-pushes it under the same app path / relative path (creating a new version).
 */
export function SecretFileEditorDialog(props: SecretFileEditorDialogProps): ReactElement {
  const { open, onClose, projectId, app, file } = props;
  const { getProjectDEK } = useVault();

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useApiMutation(
    (body: Parameters<ReturnType<typeof client.api.projects>["secrets"]["push"]["post"]>[0]) =>
      client.api.projects({ id: projectId }).secrets.push.post(body),
    {
      invalidateKeys: [
        queryKeys.repo.map(projectId),
        queryKeys.secretFiles.byProject(projectId),
        queryKeys.secretFiles.versions(projectId, file.id),
      ],
      successMessage: "Secret file saved",
      onSuccess: () => onClose(),
    },
  );

  useEffect(() => {
    if (!open || file.isBinary) return;

    let cancelled = false;
    setError(null);
    setText(null);

    client.api
      .projects({ id: projectId })
      .secrets({ fileId: file.id })
      .download.get()
      .then(async ({ data, error: err }) => {
        if (cancelled) return;
        if (err || !data) {
          setError("Failed to load secret file");
          return;
        }
        const dek = await getProjectDEK(projectId);
        const plaintext = await decrypt(data.encryptedContent, data.iv, data.authTag, dek);
        if (!cancelled) setText(plaintext);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to decrypt secret file");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the open dialog + file
  }, [open, file.id]);

  const handleSave = async () => {
    if (text === null) return;
    const dek = await getProjectDEK(projectId);
    const encrypted = await encrypt(text, dek);
    await saveMutation.mutateAsync({
      appName: app.name,
      appPath: app.appPath,
      relativePath: file.relativePath,
      environmentSlug: file.environmentSlug ?? undefined,
      mimeType: file.mimeType,
      encryptedContent: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      fileSize: new TextEncoder().encode(text).length,
      isBinary: false,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontFamily: "monospace" }}>{file.relativePath}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {file.environmentSlug && (
            <Typography variant="captionMuted">Environment: {file.environmentSlug}</Typography>
          )}
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : text === null ? (
            <Skeleton variant="rounded" height={320} />
          ) : (
            <CodeEditorLazy value={text} language="plain" onChange={setText} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saveMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={text === null || saveMutation.isPending}
          onClick={handleSave}
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
