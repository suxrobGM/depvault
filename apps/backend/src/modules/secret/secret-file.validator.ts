import { BadRequestError } from "@/common/errors";
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE } from "./secret-file.schema";

const PATH_TRAVERSAL_PATTERN = /(\.\.|[/\\])/;

export function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(`File size exceeds the maximum limit of 25 MB`);
  }

  validateFileName(file.name);
}

export function validateFileName(name: string) {
  if (PATH_TRAVERSAL_PATTERN.test(name)) {
    throw new BadRequestError("Invalid filename: path traversal patterns are not allowed");
  }

  const lowerName = name.toLowerCase();
  for (const ext of FORBIDDEN_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      throw new BadRequestError(`Executable file type "${ext}" is not allowed`);
    }
  }
}
