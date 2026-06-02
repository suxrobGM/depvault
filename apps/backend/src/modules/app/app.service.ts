import { singleton } from "tsyringe";
import { ConflictError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { AuditLogService } from "@/modules/audit-log";
import type { MessageResponse } from "@/types/response";
import { AppRepository } from "./app.repository";
import type {
  AppResponse,
  CreateAppBody,
  ExportBody,
  ExportResponse,
  RepoMapResponse,
  UpdateAppBody,
} from "./app.schema";

/** Derive a sorted, de-duplicated list of environment slugs, dropping nulls. */
function deriveEnvironments(files: { environmentSlug: string | null }[]): string[] {
  const slugs = new Set<string>();
  for (const file of files) {
    if (file.environmentSlug) {
      slugs.add(file.environmentSlug);
    }
  }
  return [...slugs].sort();
}

@singleton()
export class AppService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogService: AuditLogService,
    private readonly appRepository: AppRepository,
  ) {}

  /** List all apps in a project with file counts and derived environments. */
  async list(projectId: string): Promise<AppResponse[]> {
    const apps = await this.prisma.app.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { files: true } },
        files: { select: { environmentSlug: true } },
      },
    });

    return apps.map((app) => ({
      id: app.id,
      projectId: app.projectId,
      name: app.name,
      appPath: app.appPath,
      fileCount: app._count.files,
      environments: deriveEnvironments(app.files),
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  }

  /** Create a new app, rejecting a duplicate repo path within the project. */
  async create(projectId: string, body: CreateAppBody): Promise<AppResponse> {
    const existing = await this.prisma.app.findUnique({
      where: { projectId_appPath: { projectId, appPath: body.appPath } },
    });
    if (existing) {
      throw new ConflictError("An app already exists at this path");
    }

    const app = await this.prisma.app.create({
      data: { projectId, name: body.name, appPath: body.appPath },
    });

    return {
      id: app.id,
      projectId: app.projectId,
      name: app.name,
      appPath: app.appPath,
      fileCount: 0,
      environments: [],
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }

  /** Fetch a single app with file counts and derived environments. */
  async get(projectId: string, appId: string): Promise<AppResponse> {
    await this.appRepository.requireApp(projectId, appId);
    return this.loadResponse(appId);
  }

  /** Update an app's display name. */
  async update(projectId: string, appId: string, body: UpdateAppBody): Promise<AppResponse> {
    await this.appRepository.requireApp(projectId, appId);

    if (body.name !== undefined) {
      await this.prisma.app.update({ where: { id: appId }, data: { name: body.name } });
    }

    return this.loadResponse(appId);
  }

  /** Permanently delete an app and all of its files. */
  async delete(projectId: string, appId: string): Promise<MessageResponse> {
    await this.appRepository.requireApp(projectId, appId);
    await this.prisma.app.delete({ where: { id: appId } });
    return { message: "App deleted successfully" };
  }

  /**
   * Return the full repo map for a project: every app with its file metadata.
   * Encrypted content is never included here.
   */
  async repoMap(projectId: string): Promise<RepoMapResponse> {
    const apps = await this.prisma.app.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: {
        files: {
          orderBy: { relativePath: "asc" },
          select: {
            id: true,
            kind: true,
            relativePath: true,
            environmentSlug: true,
            format: true,
            mimeType: true,
            fileSize: true,
            isBinary: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      apps: apps.map((app) => ({
        id: app.id,
        name: app.name,
        appPath: app.appPath,
        environments: deriveEnvironments(app.files),
        files: app.files,
      })),
    };
  }

  /**
   * Export encrypted file blobs for a single file, a single environment, a single app,
   * or the whole repo. Server returns ciphertext as-is; decryption happens client-side.
   */
  async exportFiles(
    projectId: string,
    userId: string,
    body: ExportBody,
    ipAddress = "unknown",
  ): Promise<ExportResponse> {
    if (body.appId) {
      await this.appRepository.requireApp(projectId, body.appId);
    }

    const files = await this.prisma.repoFile.findMany({
      where: {
        projectId,
        ...(body.appId && { appId: body.appId }),
        ...(body.fileId && { id: body.fileId }),
        ...(body.environmentSlug && { environmentSlug: body.environmentSlug }),
      },
      orderBy: { relativePath: "asc" },
    });

    await this.auditLogService.log({
      userId,
      projectId,
      action: "DOWNLOAD",
      resourceType: "REPO_FILE",
      resourceId: body.fileId ?? body.appId ?? projectId,
      ipAddress,
      metadata: {
        appId: body.appId ?? null,
        environmentSlug: body.environmentSlug ?? null,
        fileId: body.fileId ?? null,
        fileCount: files.length,
      },
    });

    return {
      files: files.map((file) => ({
        kind: file.kind,
        relativePath: file.relativePath,
        environmentSlug: file.environmentSlug,
        format: file.format,
        mimeType: file.mimeType,
        encryptedContent: Buffer.from(file.encryptedContent).toString("base64"),
        iv: file.iv,
        authTag: file.authTag,
        isBinary: file.isBinary,
      })),
    };
  }

  private async loadResponse(appId: string): Promise<AppResponse> {
    const app = await this.prisma.app.findUniqueOrThrow({
      where: { id: appId },
      include: {
        _count: { select: { files: true } },
        files: { select: { environmentSlug: true } },
      },
    });

    return {
      id: app.id,
      projectId: app.projectId,
      name: app.name,
      appPath: app.appPath,
      fileCount: app._count.files,
      environments: deriveEnvironments(app.files),
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }
}
