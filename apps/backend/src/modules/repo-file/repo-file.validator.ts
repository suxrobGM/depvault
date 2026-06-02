import { BadRequestError } from "@/common/errors";
import type { RepoFileKind } from "@/generated/prisma";
import {
  FORBIDDEN_EXTENSIONS,
  MAX_CONFIG_FILE_SIZE,
  MAX_SECRET_FILE_SIZE,
} from "./repo-file.schema";

/** Enforce the per-kind size cap and the path/extension rules for a pushed file. */
export function validateRepoFile(kind: RepoFileKind, relativePath: string, fileSize: number): void {
  const max = kind === "CONFIG" ? MAX_CONFIG_FILE_SIZE : MAX_SECRET_FILE_SIZE;
  if (fileSize > max) {
    throw new BadRequestError(`File size exceeds the maximum limit of ${max / (1024 * 1024)} MB`);
  }

  validateFileName(relativePath);
}

/**
 * Validate a repo-relative file path. Forward-slash separators are allowed so nested paths
 * (e.g. `src/config/.env.local`) can be stored, but backslashes, `..` traversal segments,
 * absolute paths, and executable extensions are rejected.
 */
export function validateFileName(relativePath: string): void {
  if (relativePath.includes("\\")) {
    throw new BadRequestError("Invalid path: backslashes are not allowed");
  }

  if (relativePath.startsWith("/")) {
    throw new BadRequestError("Invalid path: absolute paths are not allowed");
  }

  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new BadRequestError("Invalid path: path traversal segments are not allowed");
  }

  const lowerPath = relativePath.toLowerCase();
  for (const ext of FORBIDDEN_EXTENSIONS) {
    if (lowerPath.endsWith(ext)) {
      throw new BadRequestError(`Executable file type "${ext}" is not allowed`);
    }
  }
}
