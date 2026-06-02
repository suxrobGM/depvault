"use client";

import { useState, type ReactElement } from "react";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  CreateFileShareDialog,
  type ShareableFile,
} from "@/components/features/shared-secret/create-file-share-dialog";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { useToast } from "@/hooks/use-toast";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { decryptBinary, encrypt } from "@/lib/crypto";
import { queryKeys } from "@/lib/query-keys";
import type { ConfigFileContentDto } from "@/types/api/repo";
import { downloadFile } from "@/utils/download-file";
import { formatBytes } from "@/utils/formatters";
import { CodeEditorLazy } from "./code-editor-lazy";
import { ConfigFileVersions } from "./config-file-versions";
import { EnvFormEditor } from "./env-form-editor";
import { binaryPlaceholder, resolveLanguage, supportsKeyValueForm } from "./file-format";
import { ReviewChangesDialog } from "./review-changes-dialog";
import { useDecryptedText } from "./use-decrypted-text";

interface ConfigFileEditorProps {
  projectId: string;
  fileId: string;
  canEdit: boolean;
}

type EditorTab = "form" | "raw" | "history";

export function ConfigFileEditor(props: ConfigFileEditorProps): ReactElement {
  const { projectId, fileId, canEdit } = props;
  const { getProjectDEK } = useVault();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<EditorTab>("raw");
  const [draft, setDraft] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareFile, setShareFile] = useState<ShareableFile | null>(null);

  const { data: content, isLoading } = useApiQuery<ConfigFileContentDto>(
    queryKeys.repo.configFileContent(projectId, fileId),
    () => client.api.projects({ id: projectId })["config-files"]({ fileId }).get(),
  );

  const { text, isDecrypting, error } = useDecryptedText(projectId, content);

  const saveMutation = useApiMutation(
    (body: {
      encryptedContent: string;
      iv: string;
      authTag: string;
      fileSize: number;
      isBinary: boolean;
      message?: string;
    }) => client.api.projects({ id: projectId })["config-files"]({ fileId }).put(body),
    {
      invalidateKeys: [
        queryKeys.repo.configFile(projectId, fileId),
        queryKeys.repo.configFileContent(projectId, fileId),
        queryKeys.repo.configFileVersions(projectId, fileId),
        queryKeys.repo.map(projectId),
      ],
      successMessage: "File saved",
      onSuccess: () => {
        setReviewOpen(false);
        setDraft(null);
      },
    },
  );

  const deleteMutation = useApiMutation(
    () => client.api.projects({ id: projectId })["config-files"]({ fileId }).delete(),
    {
      invalidateKeys: [queryKeys.repo.map(projectId), queryKeys.repo.apps(projectId)],
      successMessage: "File deleted",
    },
  );

  if (isLoading) {
    return <Skeleton variant="rounded" height={360} />;
  }

  if (!content) {
    return <Alert severity="error">File not found.</Alert>;
  }

  const language = resolveLanguage(content.format, content.relativePath);
  const canUseForm = supportsKeyValueForm(language);
  const currentText = draft ?? text ?? "";
  const isDirty = draft !== null && draft !== (text ?? "");

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dek = await getProjectDEK(projectId);
      const fileName = content.relativePath.split("/").pop() ?? content.relativePath;
      if (content.isBinary) {
        const buffer = await decryptBinary(
          content.encryptedContent,
          content.iv,
          content.authTag,
          dek,
        );
        downloadFile(buffer, fileName, "application/octet-stream");
      } else {
        downloadFile(text ?? "", fileName);
      }
    } catch {
      toast.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const fileName = content.relativePath.split("/").pop() ?? content.relativePath;
      if (content.isBinary) {
        const dek = await getProjectDEK(projectId);
        const buffer = await decryptBinary(
          content.encryptedContent,
          content.iv,
          content.authTag,
          dek,
        );
        setShareFile({ fileName, mimeType: "application/octet-stream", content: buffer });
      } else {
        setShareFile({ fileName, mimeType: "text/plain", content: text ?? "" });
      }
    } catch {
      toast.error("Failed to prepare file for sharing");
    }
  };

  const handleConfirmSave = async (message?: string) => {
    const dek = await getProjectDEK(projectId);
    const encrypted = await encrypt(currentText, dek);
    await saveMutation.mutateAsync({
      encryptedContent: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      fileSize: new TextEncoder().encode(currentText).length,
      isBinary: false,
      message: message?.trim() || undefined,
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete config file",
      description: `Permanently delete "${content.relativePath}" and all its version history?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
          {content.relativePath}
        </Typography>
        <Chip size="small" label={content.environmentSlug} variant="outlined" />
        <Chip size="small" label={language.toUpperCase()} variant="outlined" />
        <Box sx={{ flex: 1 }} />
        <Typography variant="captionMuted">{formatBytes(content.fileSize)}</Typography>
        <Button
          size="small"
          startIcon={
            downloading ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />
          }
          disabled={downloading}
          onClick={handleDownload}
        >
          Download
        </Button>
        <Button
          size="small"
          startIcon={<ShareIcon fontSize="small" />}
          disabled={!content.isBinary && (!!error || isDecrypting)}
          onClick={handleShare}
        >
          Share via link
        </Button>
        {canEdit && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon fontSize="small" />}
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        )}
      </Stack>

      {content.isBinary ? (
        <Alert severity="info">{binaryPlaceholder(content.fileSize)} — download-only.</Alert>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : isDecrypting ? (
        <Skeleton variant="rounded" height={320} />
      ) : (
        <>
          <Tabs value={tab} onChange={(_, value: EditorTab) => setTab(value)}>
            {canUseForm && <Tab value="form" label="Form" />}
            <Tab value="raw" label="Raw" />
            <Tab value="history" label="History" />
          </Tabs>

          {tab === "form" && canUseForm && (
            <EnvFormEditor text={currentText} readOnly={!canEdit} onChange={setDraft} />
          )}

          {tab === "raw" && (
            <CodeEditorLazy
              value={currentText}
              language={language}
              readOnly={!canEdit}
              onChange={canEdit ? setDraft : undefined}
            />
          )}

          {tab === "history" && (
            <ConfigFileVersions
              projectId={projectId}
              fileId={fileId}
              currentText={text}
              currentIsBinary={content.isBinary}
              canEdit={canEdit}
            />
          )}

          {canEdit && tab !== "history" && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
              {isDirty && (
                <Button onClick={() => setDraft(null)} disabled={saveMutation.isPending}>
                  Discard
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<SaveIcon fontSize="small" />}
                disabled={!isDirty || saveMutation.isPending}
                onClick={() => setReviewOpen(true)}
              >
                Review &amp; Save
              </Button>
            </Stack>
          )}
        </>
      )}

      {reviewOpen && (
        <ReviewChangesDialog
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          oldText={text ?? ""}
          newText={currentText}
          saving={saveMutation.isPending}
          onConfirm={handleConfirmSave}
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
    </Stack>
  );
}
