"use client";

import { useState, type ReactElement } from "react";
import { FilePresent as FileIcon, Upload as UploadIcon } from "@mui/icons-material";
import { Button, Skeleton, Stack } from "@mui/material";
import { EmptyState } from "@/components/ui/feedback";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import type { MemberListResponse } from "@/types/api/project";
import type { SecretFile, SecretFileListResponse } from "@/types/api/secret-file";
import type { Vault, VaultListResponse } from "@/types/api/vault";
import { EditSecretFileDialog } from "./edit-secret-file-dialog";
import { SecretFileTable } from "./secret-file-table";
import { UploadSecretFileDialog } from "./upload-secret-file-dialog";

interface SecretFilesTabProps {
  projectId: string;
}

export function SecretFilesTab(props: SecretFilesTabProps): ReactElement {
  const { projectId } = props;
  const { user } = useAuth();

  const [editFile, setEditFile] = useState<SecretFile | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const { data: vaults } = useApiQuery<VaultListResponse>(["vaults", projectId], () =>
    client.api.projects({ id: projectId }).vaults.get(),
  );

  const { data: filesData, isLoading } = useApiQuery<SecretFileListResponse>(
    ["secret-files", projectId],
    () =>
      client.api.projects({ id: projectId }).secrets.get({
        query: { page: 1, limit: 100 },
      }),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const canEdit = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";
  const projectVaults: Vault[] = vaults ?? [];
  const files = filesData?.items ?? [];

  return (
    <>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "flex-end",
          mb: 3,
        }}
      >
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadOpen(true)}
          >
            Upload File
          </Button>
        )}
      </Stack>
      {isLoading ? (
        <Skeleton variant="rounded" height={300} />
      ) : files.length === 0 ? (
        <EmptyState
          icon={<FileIcon />}
          title="No secret files yet"
          description={
            canEdit
              ? "Upload an encrypted file to store it securely. Only owners and editors can upload and download files."
              : "No secret files have been uploaded to this project yet."
          }
          actionLabel={canEdit ? "Upload File" : undefined}
          onAction={canEdit ? () => setUploadOpen(true) : undefined}
        />
      ) : (
        <SecretFileTable
          projectId={projectId}
          files={files}
          canEdit={canEdit}
          onEdit={setEditFile}
        />
      )}
      <UploadSecretFileDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectId={projectId}
        vaults={projectVaults}
      />
      {editFile && (
        <EditSecretFileDialog
          open={!!editFile}
          onClose={() => setEditFile(null)}
          projectId={projectId}
          file={editFile}
          vaults={projectVaults}
        />
      )}
    </>
  );
}
