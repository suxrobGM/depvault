import type { SecretFileResponse } from "./secret-file.schema";

export function toSecretFileResponse(
  file: {
    id: string;
    relativePath: string;
    environmentSlug: string | null;
    description: string | null;
    mimeType: string;
    fileSize: number;
    isBinary: boolean;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
  },
  app: { id: string; name: string; appPath: string },
): SecretFileResponse {
  return {
    id: file.id,
    appId: app.id,
    appName: app.name,
    appPath: app.appPath,
    relativePath: file.relativePath,
    environmentSlug: file.environmentSlug,
    description: file.description,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    isBinary: file.isBinary,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}
