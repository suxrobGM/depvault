import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

export const goParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return fileName.toLowerCase() === "go.mod";
  },

  parse(content: string, fileName: string): ParseResult {
    return parseGoMod(content, fileName);
  },
};

function parseGoMod(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const dependencies: ParsedDependency[] = [];
  const lines = content.split(/\r?\n/);
  let inRequireBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("//")) continue;

    // Start of require block
    if (line.startsWith("require") && line.includes("(")) {
      inRequireBlock = true;
      continue;
    }

    // End of require block
    if (inRequireBlock && line === ")") {
      inRequireBlock = false;
      continue;
    }

    // Single-line require: require module/path v1.2.3
    if (line.startsWith("require ") && !line.includes("(")) {
      const dep = parseRequireLine(line.substring("require ".length));
      if (dep) dependencies.push(dep);
      continue;
    }

    // Inside require block: module/path v1.2.3
    if (inRequireBlock) {
      const dep = parseRequireLine(line);
      if (dep) dependencies.push(dep);
    }
  }

  return { dependencies, fileName };
}

function parseRequireLine(line: string): ParsedDependency | null {
  // Strip inline comments
  const withoutComment = line.split("//")[0]!.trim();
  if (!withoutComment) return null;

  // Format: module/path v1.2.3
  const parts = withoutComment.split(/\s+/);
  if (parts.length < 2) return null;

  const name = parts[0]!;
  let version = parts[1]!;

  // Skip replace directives or invalid lines
  if (!version.startsWith("v")) return null;

  // Strip +incompatible suffix
  version = version.replace(/\+incompatible$/, "");

  return { name, version, isDirect: true };
}
