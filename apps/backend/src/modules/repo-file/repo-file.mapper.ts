import type { RepoFile } from "@/generated/prisma";
import type { RepoFileContentResponse, RepoFileResponse } from "./repo-file.schema";

type AppRef = { id: string; name: string; appPath: string };

/** Map a RepoFile row (+ its app) to the metadata response shape. */
export function toRepoFileResponse(file: RepoFile, app: AppRef): RepoFileResponse {
  return {
    id: file.id,
    appId: app.id,
    appName: app.name,
    appPath: app.appPath,
    kind: file.kind,
    relativePath: file.relativePath,
    environmentSlug: file.environmentSlug,
    format: file.format,
    mimeType: file.mimeType,
    description: file.description,
    fileSize: file.fileSize,
    isBinary: file.isBinary,
    createdBy: file.createdBy,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

/** Map a RepoFile row (+ its app) to the content response (metadata + base64 blob). */
export function toRepoFileContentResponse(file: RepoFile, app: AppRef): RepoFileContentResponse {
  return {
    ...toRepoFileResponse(file, app),
    encryptedContent: Buffer.from(file.encryptedContent).toString("base64"),
    iv: file.iv,
    authTag: file.authTag,
  };
}
