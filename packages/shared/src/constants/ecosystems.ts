/**
 * To add a new ecosystem:
 * - Prisma schema — add enum value
 * - ecosystems.ts — add config entry (labels, files, URLs, OSV)
 * - Backend parser + checker — implement the actual parsing/fetching logic
 * - Frontend SUPPORTED_ECOSYSTEMS set — add the value to enable it in the upload form
 */

import type { SelectOption } from "../types";

/** All supported ecosystem identifiers — must match Prisma Ecosystem enum. */
export const ECOSYSTEM_VALUES = [
  "NODEJS",
  "PYTHON",
  "DOTNET",
  "KOTLIN",
  "RUST",
  "GO",
  "JAVA",
  "RUBY",
  "PHP",
] as const;

export type EcosystemValue = (typeof ECOSYSTEM_VALUES)[number];

export interface EcosystemConfig {
  value: EcosystemValue;
  label: string;
  /** Dependency file names matched by exact name. */
  fileNames: string[];
  /** Dependency file extensions matched by suffix (for variable-prefix files like .csproj). */
  fileExtensions: string[];
  /** Default file name shown in the upload form. */
  defaultFile: string;
  /** URL builder for linking to the package registry. */
  registryUrl: ((name: string) => string) | null;
  /** OSV ecosystem identifier for vulnerability scanning. */
  osvEcosystem: string | null;
}

function mavenUrl(name: string): string {
  const [group, artifact] = name.includes(":") ? name.split(":") : ["", name];
  return group
    ? `https://central.sonatype.com/artifact/${group}/${artifact}`
    : `https://central.sonatype.com/search?q=${artifact}`;
}

/**
 * Single source of truth for ecosystem configuration.
 * Add new ecosystems here — backend and frontend derive everything from this.
 */
export const ECOSYSTEM_CONFIGS: readonly EcosystemConfig[] = [
  {
    value: "NODEJS",
    label: "Node.js",
    fileNames: ["package.json"],
    fileExtensions: [],
    defaultFile: "package.json",
    registryUrl: (name) => `https://www.npmjs.com/package/${name}`,
    osvEcosystem: "npm",
  },
  {
    value: "PYTHON",
    label: "Python",
    fileNames: ["requirements.txt", "pyproject.toml"],
    fileExtensions: [],
    defaultFile: "requirements.txt",
    registryUrl: (name) => `https://pypi.org/project/${name}`,
    osvEcosystem: "PyPI",
  },
  {
    value: "DOTNET",
    label: ".NET",
    fileNames: [],
    fileExtensions: [".csproj", ".fsproj", ".vbproj"],
    defaultFile: "Project.csproj",
    registryUrl: (name) => `https://www.nuget.org/packages/${name}`,
    osvEcosystem: "NuGet",
  },
  {
    value: "KOTLIN",
    label: "Kotlin",
    fileNames: ["libs.versions.toml"],
    fileExtensions: [],
    defaultFile: "libs.versions.toml",
    registryUrl: mavenUrl,
    osvEcosystem: "Maven",
  },
  {
    value: "RUST",
    label: "Rust",
    fileNames: ["Cargo.toml"],
    fileExtensions: [],
    defaultFile: "Cargo.toml",
    registryUrl: (name) => `https://crates.io/crates/${name}`,
    osvEcosystem: "crates.io",
  },
  {
    value: "GO",
    label: "Go",
    fileNames: ["go.mod"],
    fileExtensions: [],
    defaultFile: "go.mod",
    registryUrl: (name) => `https://pkg.go.dev/${name}`,
    osvEcosystem: "Go",
  },
  {
    value: "JAVA",
    label: "Java",
    fileNames: ["pom.xml", "build.gradle", "build.gradle.kts"],
    fileExtensions: [],
    defaultFile: "pom.xml",
    registryUrl: mavenUrl,
    osvEcosystem: "Maven",
  },
  {
    value: "RUBY",
    label: "Ruby",
    fileNames: ["Gemfile"],
    fileExtensions: [],
    defaultFile: "Gemfile",
    registryUrl: (name) => `https://rubygems.org/gems/${name}`,
    osvEcosystem: "RubyGems",
  },
  {
    value: "PHP",
    label: "PHP",
    fileNames: ["composer.json"],
    fileExtensions: [],
    defaultFile: "composer.json",
    registryUrl: (name) => `https://packagist.org/packages/${name}`,
    osvEcosystem: "Packagist",
  },
] as const;

/** Ecosystem options for UI dropdowns (only ecosystems with active parser support). */
export const ECOSYSTEMS: readonly SelectOption<EcosystemValue>[] = ECOSYSTEM_CONFIGS.map(
  ({ value, label }) => ({ value, label }),
);

/** Map from ecosystem value to its config — for fast lookups. */
export const ECOSYSTEM_BY_VALUE = Object.fromEntries(
  ECOSYSTEM_CONFIGS.map((c) => [c.value, c]),
) as Record<EcosystemValue, EcosystemConfig>;

/** Map from exact dependency file name to ecosystem value. */
export const DEPENDENCY_FILE_MAP: Record<string, EcosystemValue> = Object.fromEntries(
  ECOSYSTEM_CONFIGS.flatMap((c) => c.fileNames.map((f) => [f, c.value])),
);

/** Extension-based dependency file patterns (for files with variable prefixes). */
export const DEPENDENCY_EXTENSION_PATTERNS: ReadonlyArray<{
  ext: string;
  ecosystem: EcosystemValue;
}> = ECOSYSTEM_CONFIGS.flatMap((c) => c.fileExtensions.map((ext) => ({ ext, ecosystem: c.value })));

/** Get display label for an ecosystem value. */
export function getEcosystemLabel(ecosystem: string): string {
  return (ECOSYSTEM_BY_VALUE as Record<string, EcosystemConfig>)[ecosystem]?.label ?? ecosystem;
}

/** Get package registry URL for a dependency. */
export function getPackageUrl(ecosystem: string, packageName: string): string | null {
  const config = (ECOSYSTEM_BY_VALUE as Record<string, EcosystemConfig>)[ecosystem];
  return config?.registryUrl?.(packageName) ?? null;
}

/** Get OSV ecosystem identifier for vulnerability scanning. */
export function getOsvEcosystem(ecosystem: string): string | null {
  return (ECOSYSTEM_BY_VALUE as Record<string, EcosystemConfig>)[ecosystem]?.osvEcosystem ?? null;
}
