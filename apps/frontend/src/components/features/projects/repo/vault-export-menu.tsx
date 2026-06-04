"use client";

import { useState, type ReactElement } from "react";
import {
  Download as DownloadIcon,
  FolderZip as ExportIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import type { RepoMapAppDto } from "@/api/types/repo";
import { CreateFileShareDialog, type ShareableFile } from "@/components/features/share-link";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/inputs";
import { useToast } from "@/hooks/use-toast";
import { useVault } from "@/hooks/use-vault";
import { downloadFile } from "@/utils/download-file";
import { buildVaultZip } from "./build-vault-zip";

interface VaultExportMenuProps {
  projectId: string;
  projectName: string;
  apps: RepoMapAppDto[];
}

const ZIP_MIME = "application/zip";

/**
 * Whole-vault export menu shown in the repo explorer header. Bundles every file
 * (config + secrets), decrypted client-side, into one zip that can be downloaded
 * directly or handed to the one-time share-link flow as a binary payload. Uses a
 * dedicated zip-archive trigger so it reads distinctly from the per-file menu.
 */
export function VaultExportMenu(props: VaultExportMenuProps): ReactElement {
  const { projectId, projectName, apps } = props;
  const { getProjectDEK } = useVault();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [shareZip, setShareZip] = useState<ShareableFile | null>(null);

  const files = apps.flatMap((app) => app.files);
  const zipName = `${projectName || "depvault"}-vault.zip`;

  /** Builds the zip and returns its bytes as an ArrayBuffer, or null on failure. */
  const buildZip = async (): Promise<ArrayBuffer | null> => {
    if (files.length === 0) {
      toast.error("This vault has no files to export");
      return null;
    }
    setBusy(true);
    try {
      return await buildVaultZip(projectId, files, getProjectDEK);
    } catch {
      toast.error("Failed to build vault archive");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    const buffer = await buildZip();
    if (buffer) downloadFile(buffer, zipName, ZIP_MIME);
  };

  const handleShare = async () => {
    const buffer = await buildZip();
    if (buffer) setShareZip({ fileName: zipName, mimeType: ZIP_MIME, content: buffer });
  };

  const actions: ActionMenuItem[] = [
    {
      label: "Download all files",
      icon: <DownloadIcon fontSize="small" />,
      onClick: handleDownload,
    },
    {
      label: "Share vault link",
      icon: <ShareIcon fontSize="small" />,
      onClick: handleShare,
    },
  ];

  return (
    <>
      <ActionMenu
        items={actions}
        disabled={busy || files.length === 0}
        icon={<ExportIcon fontSize="small" />}
        tooltip="Export vault (download or share all files)"
      />

      {shareZip && (
        <CreateFileShareDialog
          open={!!shareZip}
          onClose={() => setShareZip(null)}
          projectId={projectId}
          file={shareZip}
        />
      )}
    </>
  );
}
