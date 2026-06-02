"use client";

import { useState, type ReactElement } from "react";
import { decryptBinary, encrypt } from "@depvault/crypto";
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
import { CreateFileShareDialog, type ShareableFile } from "@/components/features/share-link";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useConfirm } from "@/hooks/use-confirm";
import { useToast } from "@/hooks/use-toast";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { RepoFileContentDto, SaveRepoFileBody } from "@/types/api/repo";
import { downloadFile } from "@/utils/download-file";
import { formatBytes } from "@/utils/formatters";
import { CodeEditorLazy } from "./code-editor-lazy";
import { EnvFormEditor } from "./env-form-editor";
import { binaryPlaceholder, resolveLanguage, supportsKeyValueForm } from "./file-format";
import { FileVersions } from "./file-versions";
import { ReviewChangesDialog } from "./review-changes-dialog";
import { useDecryptedText } from "./use-decrypted-text";

interface FileEditorProps {
  projectId: string;
  fileId: string;
  canEdit: boolean;
}

type EditorTab = "form" | "raw" | "history";

/**
 * Inline editor for a single repo file. Behavior branches on `kind` + `isBinary`:
 * CONFIG text → Form (key/value) + Raw + History; SECRET text → Raw + History;
 * either kind, binary → download-only + History.
 */
export function FileEditor(props: FileEditorProps): ReactElement {
  const { projectId, fileId, canEdit } = props;
  const { getProjectDEK } = useVault();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<EditorTab>("raw");
  const [draft, setDraft] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareFile, setShareFile] = useState<ShareableFile | null>(null);

  const { data: content, isLoading } = useApiQuery<RepoFileContentDto>(
    queryKeys.repo.fileContent(projectId, fileId),
    () => client.api.projects({ id: projectId }).files({ fileId }).get(),
  );

  const { text, isDecrypting, error } = useDecryptedText(projectId, content);

  const saveMutation = useApiMutation(
    (body: SaveRepoFileBody) => client.api.projects({ id: projectId }).files({ fileId }).put(body),
    {
      invalidateKeys: [
        queryKeys.repo.file(projectId, fileId),
        queryKeys.repo.fileContent(projectId, fileId),
        queryKeys.repo.fileVersions(projectId, fileId),
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
    () => client.api.projects({ id: projectId }).files({ fileId }).delete(),
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

  const isSecret = content.kind === "SECRET";
  const language = resolveLanguage(content.format, content.relativePath);
  const canUseForm = !isSecret && supportsKeyValueForm(language);
  const currentText = draft ?? text ?? "";
  const isDirty = draft !== null && draft !== (text ?? "");
  const downloadMime = content.mimeType ?? "application/octet-stream";

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
        downloadFile(buffer, fileName, downloadMime);
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
        setShareFile({ fileName, mimeType: downloadMime, content: buffer });
      } else {
        setShareFile({ fileName, mimeType: content.mimeType ?? "text/plain", content: text ?? "" });
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
      title: "Delete file",
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
        <Chip
          size="small"
          label={isSecret ? "Secret" : "Config"}
          color={isSecret ? "warning" : "info"}
          variant="outlined"
        />
        {content.environmentSlug && (
          <Chip size="small" label={content.environmentSlug} variant="outlined" />
        )}
        <Chip
          size="small"
          label={isSecret ? (content.mimeType ?? "binary") : language.toUpperCase()}
          variant="outlined"
        />
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
        <>
          <Alert severity="info">{binaryPlaceholder(content.fileSize)} — download-only.</Alert>
          <FileVersions
            projectId={projectId}
            fileId={fileId}
            currentText={null}
            currentIsBinary
            canEdit={canEdit}
          />
        </>
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
            <FileVersions
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
