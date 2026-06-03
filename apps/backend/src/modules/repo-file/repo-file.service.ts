import { singleton } from "tsyringe";
import { type AuditAction } from "@/generated/prisma";
import { AppRepository } from "@/modules/app";
import { AuditLogService } from "@/modules/audit-log";
import { PlanEnforcementService } from "@/modules/subscription/plan-enforcement.service";
import type { MessageResponse, PaginatedResponse } from "@/types/response";
import { toRepoFileContentResponse, toRepoFileResponse } from "./repo-file.mapper";
import { RepoFileRepository, type RepoFileWithApp } from "./repo-file.repository";
import type {
  PushRepoFileBody,
  RepoFileContentResponse,
  RepoFileListQuery,
  RepoFileResponse,
  RepoFileVersionListResponse,
  SaveRepoFileBody,
  UpdateRepoFileBody,
} from "./repo-file.schema";
import { validateRepoFile } from "./repo-file.validator";

type AuditMetadata = Record<string, string | number | boolean | null>;

/** CRUD + version history for the unified RepoFile model (CONFIG and SECRET kinds). */
@singleton()
export class RepoFileService {
  constructor(
    private readonly repository: RepoFileRepository,
    private readonly appRepository: AppRepository,
    private readonly auditLogService: AuditLogService,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  /**
   * Push a file from the CLI. Upserts the owning app, then creates the file or replaces an
   * existing one (snapshotting the prior content as a version). Identity is `(projectId,
   * relativePath)`; `appId` is updated when the file re-groups under a different app. When the
   * pushed content matches the stored blob (same keyed `contentHash`), the push is a no-op: the
   * existing file is returned with no new version, blob rewrite, or audit entry.
   */
  async push(
    projectId: string,
    userId: string,
    body: PushRepoFileBody,
    ipAddress = "unknown",
  ): Promise<RepoFileResponse> {
    await this.planEnforcement.enforceForProject(projectId, "repoFile");
    validateRepoFile(body.kind, body.relativePath, body.fileSize);

    const existing = await this.repository.findByPath(projectId, body.relativePath);

    // Unchanged re-push: the same plaintext (matching keyed content hash) is already stored, so
    // skip the version snapshot, blob rewrite, and audit entry. This keeps repeated pushes (CI
    // re-runs, a `push` with no edits) from accumulating redundant history. A null stored hash
    // (pre-existing rows) or a missing client hash falls through to a normal push.
    if (existing && existing.contentHash != null && existing.contentHash === body.contentHash) {
      return toRepoFileResponse(existing, existing.app);
    }

    const app = await this.appRepository.upsertByPath(projectId, body.appPath, body.appName);
    const blob = toBlobData(body);

    let file: RepoFileWithApp;
    if (existing) {
      await this.repository.snapshotVersion(existing, userId, "push");
      file = await this.repository.update(existing.id, { ...blob, appId: app.id });
    } else {
      file = await this.repository.create({
        ...blob,
        projectId,
        appId: app.id,
        relativePath: body.relativePath,
        createdBy: userId,
      });
    }

    await this.logFileAction(userId, projectId, "UPLOAD", file.id, ipAddress, {
      kind: body.kind,
      appPath: body.appPath,
      relativePath: body.relativePath,
      environmentSlug: body.environmentSlug ?? null,
    });

    return toRepoFileResponse(file, file.app);
  }

  /**
   * Save an edited file from the web app. Snapshots the current content as a version, then
   * replaces it with the new client-encrypted blob (clearing the content hash, since this blob
   * was not pushed through the CLI's keyed-hash path).
   */
  async webSave(
    projectId: string,
    fileId: string,
    userId: string,
    body: SaveRepoFileBody,
    ipAddress = "unknown",
  ): Promise<RepoFileResponse> {
    const existing = await this.repository.requireFile(projectId, fileId);
    await this.repository.snapshotVersion(existing, userId, body.message ?? null);

    const updated = await this.repository.update(fileId, {
      encryptedContent: decodeContent(body.encryptedContent),
      iv: body.iv,
      authTag: body.authTag,
      fileSize: body.fileSize,
      isBinary: body.isBinary,
      contentHash: null,
    });

    await this.logFileAction(userId, projectId, "UPDATE", fileId, ipAddress, {
      relativePath: updated.relativePath,
      environmentSlug: updated.environmentSlug,
    });

    return toRepoFileResponse(updated, updated.app);
  }

  /** Update file metadata only — never moves the file across apps or paths. */
  async update(
    projectId: string,
    fileId: string,
    body: UpdateRepoFileBody,
  ): Promise<RepoFileResponse> {
    await this.repository.requireFile(projectId, fileId);

    const updated = await this.repository.update(fileId, {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.environmentSlug !== undefined && { environmentSlug: body.environmentSlug }),
    });

    return toRepoFileResponse(updated, updated.app);
  }

  /** List file metadata (no encrypted blob) for a project, optionally filtered. */
  async list(
    projectId: string,
    query: RepoFileListQuery,
  ): Promise<PaginatedResponse<RepoFileResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      projectId,
      ...(query.appId && { appId: query.appId }),
      ...(query.environmentSlug && { environmentSlug: query.environmentSlug }),
      ...(query.kind && { kind: query.kind }),
    };

    const [files, total] = await this.repository.listWithCount(where, (page - 1) * limit, limit);

    return {
      items: files.map((file) => toRepoFileResponse(file, file.app)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Return the encrypted blob and crypto params for a file (decryption is client-side). */
  async getContent(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<RepoFileContentResponse> {
    const file = await this.repository.requireFile(projectId, fileId);

    await this.logFileAction(userId, projectId, "DOWNLOAD", fileId, ipAddress, {
      relativePath: file.relativePath,
      kind: file.kind,
    });

    return toRepoFileContentResponse(file, file.app);
  }

  /** List version history metadata (no blob) for a file, newest first. */
  async listVersions(projectId: string, fileId: string): Promise<RepoFileVersionListResponse> {
    const file = await this.repository.requireFile(projectId, fileId);
    const items = await this.repository.listVersions(file.id);
    return { items };
  }

  /** Return the encrypted blob of a specific version (for diff or restore). */
  async getVersionContent(
    projectId: string,
    fileId: string,
    versionId: string,
  ): Promise<RepoFileContentResponse> {
    const file = await this.repository.requireFile(projectId, fileId);
    const version = await this.repository.requireVersion(file.id, versionId);

    return {
      ...toRepoFileResponse(file, file.app),
      fileSize: version.fileSize,
      isBinary: version.isBinary,
      encryptedContent: Buffer.from(version.encryptedContent).toString("base64"),
      iv: version.iv,
      authTag: version.authTag,
    };
  }

  /** Restore a file to a previous version, snapshotting the current content first. */
  async restoreVersion(
    projectId: string,
    fileId: string,
    versionId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<RepoFileResponse> {
    const file = await this.repository.requireFile(projectId, fileId);
    const version = await this.repository.requireVersion(file.id, versionId);

    await this.repository.snapshotVersion(file, userId, "restore");

    const updated = await this.repository.update(fileId, {
      encryptedContent: version.encryptedContent,
      iv: version.iv,
      authTag: version.authTag,
      fileSize: version.fileSize,
      isBinary: version.isBinary,
      contentHash: null,
    });

    await this.logFileAction(userId, projectId, "UPDATE", fileId, ipAddress, {
      relativePath: updated.relativePath,
      restoredFrom: versionId,
    });

    return toRepoFileResponse(updated, updated.app);
  }

  /** Permanently delete a file and its version history. */
  async delete(
    projectId: string,
    fileId: string,
    userId: string,
    ipAddress = "unknown",
  ): Promise<MessageResponse> {
    const file = await this.repository.requireFile(projectId, fileId);
    await this.repository.delete(fileId);

    await this.logFileAction(userId, projectId, "DELETE", fileId, ipAddress, {
      relativePath: file.relativePath,
      kind: file.kind,
    });

    return { message: "File deleted successfully" };
  }

  private logFileAction(
    userId: string,
    projectId: string,
    action: AuditAction,
    resourceId: string,
    ipAddress: string,
    metadata: AuditMetadata,
  ): Promise<void> {
    return this.auditLogService.log({
      userId,
      projectId,
      action,
      resourceType: "REPO_FILE",
      resourceId,
      ipAddress,
      metadata,
    });
  }
}

/** Decode a base64 client blob into the bytes Prisma stores for the `Bytes` column. */
function decodeContent(base64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/** Shared write payload for a pushed file — the fields common to both create and update. */
function toBlobData(body: PushRepoFileBody) {
  return {
    kind: body.kind,
    environmentSlug: body.environmentSlug ?? null,
    format: body.format ?? null,
    mimeType: body.mimeType ?? null,
    description: body.description ?? null,
    encryptedContent: decodeContent(body.encryptedContent),
    iv: body.iv,
    authTag: body.authTag,
    fileSize: body.fileSize,
    isBinary: body.isBinary,
    contentHash: body.contentHash ?? null,
  };
}
