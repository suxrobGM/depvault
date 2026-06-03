import { singleton } from "tsyringe";
import { NotFoundError } from "@/common/errors";
import { PrismaClient, type Prisma, type RepoFile, type RepoFileVersion } from "@/generated/prisma";

export const APP_SELECT = { app: { select: { id: true, name: true, appPath: true } } } as const;

const VERSION_SUMMARY_SELECT = {
  id: true,
  fileSize: true,
  isBinary: true,
  changedBy: true,
  message: true,
  createdAt: true,
} as const;

export type RepoFileWithApp = RepoFile & { app: { id: string; name: string; appPath: string } };

export type RepoFileVersionSummary = Prisma.RepoFileVersionGetPayload<{
  select: typeof VERSION_SUMMARY_SELECT;
}>;

/**
 * Prisma data access for the RepoFile + RepoFileVersion tables. Holds only queries — no plan
 * enforcement, validation, audit logging, or response mapping (those live in the service).
 */
@singleton()
export class RepoFileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Find a file by its `(projectId, relativePath)` identity, including its owning app. */
  findByPath(projectId: string, relativePath: string): Promise<RepoFileWithApp | null> {
    return this.prisma.repoFile.findUnique({
      where: { projectId_relativePath: { projectId, relativePath } },
      include: APP_SELECT,
    });
  }

  /** Resolve a file scoped to a project (with its app), throwing if it does not exist. */
  async requireFile(projectId: string, fileId: string): Promise<RepoFileWithApp> {
    const file = await this.prisma.repoFile.findFirst({
      where: { id: fileId, projectId },
      include: APP_SELECT,
    });

    if (!file) {
      throw new NotFoundError("File not found");
    }

    return file;
  }

  create(data: Prisma.RepoFileUncheckedCreateInput): Promise<RepoFileWithApp> {
    return this.prisma.repoFile.create({ data, include: APP_SELECT });
  }

  update(fileId: string, data: Prisma.RepoFileUncheckedUpdateInput): Promise<RepoFileWithApp> {
    return this.prisma.repoFile.update({ where: { id: fileId }, data, include: APP_SELECT });
  }

  delete(fileId: string): Promise<RepoFile> {
    return this.prisma.repoFile.delete({ where: { id: fileId } });
  }

  /** Return a page of file metadata (with app) plus the total matching count. */
  listWithCount(
    where: Prisma.RepoFileWhereInput,
    skip: number,
    take: number,
  ): Promise<[RepoFileWithApp[], number]> {
    return Promise.all([
      this.prisma.repoFile.findMany({
        where,
        skip,
        take,
        orderBy: { relativePath: "asc" },
        include: APP_SELECT,
      }),
      this.prisma.repoFile.count({ where }),
    ]);
  }

  /** Snapshot a file's current blob as an immutable version. */
  snapshotVersion(
    file: RepoFile,
    userId: string,
    message: string | null,
  ): Promise<RepoFileVersion> {
    return this.prisma.repoFileVersion.create({
      data: {
        repoFileId: file.id,
        encryptedContent: file.encryptedContent,
        iv: file.iv,
        authTag: file.authTag,
        fileSize: file.fileSize,
        isBinary: file.isBinary,
        changedBy: userId,
        message,
      },
    });
  }

  /** List version history metadata (no blob) for a file, newest first. */
  listVersions(repoFileId: string): Promise<RepoFileVersionSummary[]> {
    return this.prisma.repoFileVersion.findMany({
      where: { repoFileId },
      orderBy: { createdAt: "desc" },
      select: VERSION_SUMMARY_SELECT,
    });
  }

  /** Resolve a version scoped to its file, throwing if it does not exist. */
  async requireVersion(repoFileId: string, versionId: string): Promise<RepoFileVersion> {
    const version = await this.prisma.repoFileVersion.findFirst({
      where: { id: versionId, repoFileId },
    });

    if (!version) {
      throw new NotFoundError("File version not found");
    }

    return version;
  }
}
