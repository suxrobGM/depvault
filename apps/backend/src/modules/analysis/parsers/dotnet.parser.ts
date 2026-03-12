import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

const SUPPORTED_EXTENSIONS = [".csproj", ".fsproj", ".vbproj"];

export const dotnetParser: DependencyParser = {
  canParse(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  },

  parse(content: string, fileName: string): ParseResult {
    const lower = fileName.toLowerCase();

    if (!SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      throw new BadRequestError(`Unsupported .NET file: ${fileName}`);
    }

    return parseCsproj(content, fileName);
  },
};

const PACKAGE_REF_REGEX =
  /<PackageReference\s+[^>]*?Include\s*=\s*"([^"]+)"[^>]*?Version\s*=\s*"([^"]+)"[^>]*?\/?>/gi;

const PACKAGE_REF_ALT_REGEX =
  /<PackageReference\s+[^>]*?Version\s*=\s*"([^"]+)"[^>]*?Include\s*=\s*"([^"]+)"[^>]*?\/?>/gi;

const PACKAGE_REF_CHILD_REGEX =
  /<PackageReference\s+[^>]*?Include\s*=\s*"([^"]+)"[^>]*?>\s*<Version>([^<]+)<\/Version>/gi;

function parseCsproj(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  // Match <PackageReference Include="Name" Version="1.0.0" />
  for (const match of content.matchAll(PACKAGE_REF_REGEX)) {
    addDep(match[1]!, match[2]!, dependencies, seen);
  }

  // Match <PackageReference Version="1.0.0" Include="Name" /> (reversed attributes)
  for (const match of content.matchAll(PACKAGE_REF_ALT_REGEX)) {
    addDep(match[2]!, match[1]!, dependencies, seen);
  }

  // Match <PackageReference Include="Name"><Version>1.0.0</Version></PackageReference>
  for (const match of content.matchAll(PACKAGE_REF_CHILD_REGEX)) {
    addDep(match[1]!, match[2]!, dependencies, seen);
  }

  return { dependencies, fileName };
}

function addDep(name: string, version: string, deps: ParsedDependency[], seen: Set<string>): void {
  const trimmedName = name.trim();
  const trimmedVersion = version.trim();
  if (!trimmedName || !trimmedVersion || seen.has(trimmedName.toLowerCase())) return;

  seen.add(trimmedName.toLowerCase());
  deps.push({ name: trimmedName, version: trimmedVersion, isDirect: true });
}
