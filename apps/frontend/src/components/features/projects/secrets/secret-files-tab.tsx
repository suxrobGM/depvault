"use client";

import { useState, type ReactElement } from "react";
import type { SecretFileEnvironmentTypeValue } from "@depvault/shared/constants";
import type { SelectOption } from "@depvault/shared/types";
import { FilePresent as FileIcon } from "@mui/icons-material";
import { Chip, Skeleton, Stack } from "@mui/material";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { SecretFile, SecretFileListResponse } from "@/types/api/secret-file";
import type { VaultGroup } from "@/types/api/vault-group";
import { EditSecretFileDialog } from "./edit-secret-file-dialog";
import { SecretFileTable } from "./secret-file-table";
import { UploadSecretFileDialog } from "./upload-secret-file-dialog";

interface SecretFilesTabProps {
  projectId: string;
  canEdit: boolean;
  vaultGroups: VaultGroup[];
  uploadOpen: boolean;
  onUploadOpen: () => void;
  onUploadClose: () => void;
}

const ENV_FILTERS: SelectOption<SecretFileEnvironmentTypeValue>[] = [
  { label: "Global", value: "GLOBAL" },
  { label: "Development", value: "DEVELOPMENT" },
  { label: "Staging", value: "STAGING" },
  { label: "Production", value: "PRODUCTION" },
];

export function SecretFilesTab(props: SecretFilesTabProps): ReactElement {
  const { projectId, canEdit, vaultGroups, uploadOpen, onUploadOpen, onUploadClose } = props;

  const [activeEnv, setActiveEnv] = useState<SecretFileEnvironmentTypeValue>("GLOBAL");
  const [editFile, setEditFile] = useState<SecretFile | null>(null);

  const { data: filesData, isLoading } = useApiQuery<SecretFileListResponse>(
    ["secret-files", projectId, activeEnv],
    () =>
      client.api.projects({ id: projectId }).secrets.get({
        query: { environmentType: activeEnv, page: 1, limit: 100 },
      }),
  );

  const files = filesData?.items ?? [];

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {ENV_FILTERS.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            variant={activeEnv === f.value ? "filled" : "outlined"}
            color={activeEnv === f.value ? "primary" : "default"}
            onClick={() => setActiveEnv(f.value)}
            size="small"
          />
        ))}
      </Stack>

      {isLoading ? (
        <Skeleton variant="rounded" height={300} />
      ) : files.length === 0 ? (
        <EmptyState
          icon={<FileIcon />}
          title={activeEnv ? `No files in ${activeEnv.toLowerCase()}` : "No secret files yet"}
          description={
            canEdit
              ? "Upload an encrypted file to store it securely. Only owners and editors can upload and download files."
              : "No secret files have been uploaded to this project yet."
          }
          actionLabel={canEdit ? "Upload File" : undefined}
          onAction={canEdit ? onUploadOpen : undefined}
        />
      ) : (
        <SecretFileTable
          projectId={projectId}
          files={files}
          activeEnv={activeEnv}
          canEdit={canEdit}
          onEdit={setEditFile}
        />
      )}

      <UploadSecretFileDialog
        open={uploadOpen}
        onClose={onUploadClose}
        projectId={projectId}
        vaultGroups={vaultGroups}
      />

      {editFile && (
        <EditSecretFileDialog
          open={!!editFile}
          onClose={() => setEditFile(null)}
          projectId={projectId}
          file={editFile}
          vaultGroups={vaultGroups}
        />
      )}
    </>
  );
}
