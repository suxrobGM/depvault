import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

export const phpParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return fileName.toLowerCase() === "composer.json";
  },

  parse(content: string, fileName: string): ParseResult {
    return parseComposerJson(content, fileName);
  },
};

function parseComposerJson(content: string, fileName: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new BadRequestError(`Invalid JSON in ${fileName}`);
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new BadRequestError("composer.json must be a JSON object");
  }

  const record = json as Record<string, unknown>;
  const dependencies: ParsedDependency[] = [];

  extractDeps(record.require, dependencies);
  extractDeps(record["require-dev"], dependencies);

  return { dependencies, fileName };
}

function extractDeps(section: unknown, result: ParsedDependency[]): void {
  if (!section || typeof section !== "object" || Array.isArray(section)) return;

  for (const [name, version] of Object.entries(section as Record<string, unknown>)) {
    if (typeof version !== "string") continue;

    // Skip PHP platform requirements (php, ext-*, lib-*)
    if (name === "php" || name.startsWith("ext-") || name.startsWith("lib-")) continue;

    result.push({ name, version, isDirect: true });
  }
}
