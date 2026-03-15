import { BadRequestError } from "@/common/errors";
import type { DependencyParser, ParsedDependency, ParseResult } from "./types";

const SUPPORTED_FILES = ["pom.xml", "build.gradle", "build.gradle.kts"];

export const javaParser: DependencyParser = {
  canParse(fileName: string): boolean {
    return SUPPORTED_FILES.includes(fileName.toLowerCase());
  },

  parse(content: string, fileName: string): ParseResult {
    const lower = fileName.toLowerCase();

    if (lower === "pom.xml") return parsePomXml(content, fileName);
    if (lower === "build.gradle" || lower === "build.gradle.kts") {
      return parseBuildGradle(content, fileName);
    }

    throw new BadRequestError(`Unsupported Java file: ${fileName}`);
  },
};

// --- pom.xml ---

const DEPENDENCY_BLOCK_REGEX = /<dependency>\s*([\s\S]*?)\s*<\/dependency>/gi;

const GROUP_ID_REGEX = /<groupId>([^<]+)<\/groupId>/i;
const ARTIFACT_ID_REGEX = /<artifactId>([^<]+)<\/artifactId>/i;
const VERSION_REGEX = /<version>([^<]+)<\/version>/i;

function parsePomXml(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(DEPENDENCY_BLOCK_REGEX)) {
    const block = match[1]!;
    const groupId = block.match(GROUP_ID_REGEX)?.[1]?.trim();
    const artifactId = block.match(ARTIFACT_ID_REGEX)?.[1]?.trim();
    const version = block.match(VERSION_REGEX)?.[1]?.trim() || "*";

    if (!groupId || !artifactId) continue;

    const name = `${groupId}:${artifactId}`;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    dependencies.push({ name, version, isDirect: true });
  }

  return { dependencies, fileName };
}

// --- build.gradle / build.gradle.kts ---

/** Matches dependency declarations like: implementation 'group:artifact:version' */
const GRADLE_STRING_DEP_REGEX =
  /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|classpath|annotationProcessor|kapt|ksp)\s*\(?["']([^"']+)["']\)?/g;

/** Matches group/name/version form: implementation group: 'g', name: 'a', version: 'v' */
const GRADLE_MAP_DEP_REGEX =
  /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|classpath|annotationProcessor|kapt|ksp)\s+group:\s*["']([^"']+)["'],\s*name:\s*["']([^"']+)["'](?:,\s*version:\s*["']([^"']+)["'])?/g;

function parseBuildGradle(content: string, fileName: string): ParseResult {
  if (!content.trim()) {
    throw new BadRequestError(`Empty file: ${fileName}`);
  }

  const dependencies: ParsedDependency[] = [];
  const seen = new Set<string>();

  // String notation: implementation 'group:artifact:version'
  for (const match of content.matchAll(GRADLE_STRING_DEP_REGEX)) {
    const coords = match[1]!;
    const parts = coords.split(":");
    if (parts.length < 2) continue;

    const name = `${parts[0]}:${parts[1]}`;
    const version = parts[2] || "*";
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    dependencies.push({ name, version, isDirect: true });
  }

  // Map notation: implementation group: 'g', name: 'a', version: 'v'
  for (const match of content.matchAll(GRADLE_MAP_DEP_REGEX)) {
    const name = `${match[1]}:${match[2]}`;
    const version = match[3] || "*";
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    dependencies.push({ name, version, isDirect: true });
  }

  return { dependencies, fileName };
}
