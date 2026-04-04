import { readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { DEPENDENCY_FILE_MAP } from "@depvault/shared";

const MAX_DEPTH = 10;

const EXCLUDED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".yarn",
  ".pnpm-store",
  "bower_components",
  "__pycache__",
  ".venv",
  "venv",
  ".tox",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  "bin",
  "obj",
  ".nuget",
  "packages",
  "TestResults",
  "publish",
  "artifacts",
  "target",
  "vendor",
  ".gradle",
  ".mvn",
  ".bundle",
  "dist",
  "build",
  "out",
  ".output",
  ".next",
  ".angular",
  ".turbo",
  ".nx",
  ".parcel-cache",
  ".cache",
  ".vite",
  ".svelte-kit",
  ".vs",
  ".idea",
  ".vscode",
  "coverage",
  "generated",
  "logs",
  "temp",
  "tmp",
]);

const ENV_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.staging",
  ".env.production",
  ".env.test",
]);

const SECRET_FILE_EXTENSIONS = new Set([".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"]);

const SECRET_FILE_NAMES = new Set([
  "firebase-config.json",
  "service-account.json",
  "service-account-key.json",
  "credentials.json",
  "gcp-key.json",
  "google-services.json",
  "GoogleService-Info.plist",
]);

function walk(dir: string, depth: number, results: string[]): void {
  if (depth > MAX_DEPTH) return;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.toLowerCase())) continue;

    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walk(fullPath, depth + 1, results);
    } else if (stat.isFile()) {
      results.push(fullPath);
    }
  }
}

function getAllFiles(rootDir: string): string[] {
  const results: string[] = [];
  walk(rootDir, 0, results);
  return results;
}

export function findDependencyFiles(rootDir: string): string[] {
  return getAllFiles(rootDir).filter((f) => {
    const name = basename(f);
    return name in (DEPENDENCY_FILE_MAP as Record<string, unknown>);
  });
}

export function findEnvFiles(rootDir: string): string[] {
  return getAllFiles(rootDir).filter((f) => {
    const name = basename(f);
    return ENV_FILE_NAMES.has(name) || name.startsWith(".env.");
  });
}

export function findSecretFiles(rootDir: string): string[] {
  return getAllFiles(rootDir).filter((f) => {
    const name = basename(f);
    const ext = extname(f).toLowerCase();
    return (
      SECRET_FILE_EXTENSIONS.has(ext) ||
      SECRET_FILE_NAMES.has(name) ||
      name.includes("firebase-adminsdk")
    );
  });
}

export type FileCategory = "environment" | "secret";

export interface DiscoveredFile {
  fullPath: string;
  relativePath: string;
  fileName: string;
  category: FileCategory;
}

/** Find all pushable files (env + secret) and return them with metadata. */
export function findPushableFiles(rootDir: string): DiscoveredFile[] {
  const envFiles = findEnvFiles(rootDir).map((f) => toDiscovered(rootDir, f, "environment"));
  const secretFiles = findSecretFiles(rootDir).map((f) => toDiscovered(rootDir, f, "secret"));
  return [...envFiles, ...secretFiles].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function toDiscovered(rootDir: string, fullPath: string, category: FileCategory): DiscoveredFile {
  return {
    fullPath,
    relativePath: relative(rootDir, fullPath).replace(/\\/g, "/"),
    fileName: basename(fullPath),
    category,
  };
}

/** Detect environment type from a filename (e.g. ".env.production" → "PRODUCTION"). */
export function detectEnvironmentType(fileName: string): string | null {
  const segments = fileName.toLowerCase().split(/[.\-_]/);
  for (const seg of segments) {
    if (seg === "production" || seg === "prod") return "PRODUCTION";
    if (seg === "staging" || seg === "stage") return "STAGING";
    if (seg === "development" || seg === "dev") return "DEVELOPMENT";
  }
  return null;
}

/** Detect config format from filename extension. */
export function detectFormat(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "appsettings.json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "secrets.yaml";
  if (lower.endsWith(".toml")) return "config.toml";
  return "env";
}
