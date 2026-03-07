import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

export const nodejsParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return fileName.toLowerCase() === "package.json";
  },

  parse(content: string, fileName: string): ParseResult {
    if (fileName.toLowerCase() !== "package.json") {
      throw new BadRequestError(`Unsupported Node.js file: ${fileName}`);
    }

    return parsePackageJson(content, fileName);
  },
};

function parsePackageJson(content: string, fileName: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new BadRequestError(`Invalid JSON in ${fileName}`);
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new BadRequestError("package.json must be a JSON object");
  }

  const record = json as Record<string, unknown>;
  const dependencies: ParsedDependency[] = [];

  extractDeps(record.dependencies, dependencies);
  extractDeps(record.devDependencies, dependencies);

  return { dependencies, fileName };
}

function extractDeps(section: unknown, result: ParsedDependency[]): void {
  if (!section || typeof section !== "object" || Array.isArray(section)) return;

  for (const [name, version] of Object.entries(section as Record<string, unknown>)) {
    if (typeof version === "string") {
      result.push({ name, version, isDirect: true });
    }
  }
}
