import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

export const rubyParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return fileName.toLowerCase() === "gemfile";
  },

  parse(content: string, fileName: string): ParseResult {
    return parseGemfile(content, fileName);
  },
};

/** Matches: gem 'name', 'version' or gem "name", "~> 1.0" */
const GEM_REGEX = /^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/;

function parseGemfile(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const dependencies: ParsedDependency[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const match = line.match(GEM_REGEX);
    if (!match) continue;

    const name = match[1]!;
    const version = match[2] || "*";

    dependencies.push({ name, version, isDirect: true });
  }

  return { dependencies, fileName };
}
