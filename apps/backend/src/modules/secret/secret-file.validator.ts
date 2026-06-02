import { BadRequestError } from "@/common/errors";
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE } from "./secret-file.schema";

export function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(`File size exceeds the maximum limit of 25 MB`);
  }

  validateFileName(file.name);
}

/**
 * Validate a repo-relative file path. Forward-slash separators are allowed so
 * nested paths (e.g. `src/config/.env.local`) can be stored, but backslashes,
 * `..` traversal segments, absolute paths, and executable extensions are rejected.
 */
export function validateFileName(relativePath: string) {
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
