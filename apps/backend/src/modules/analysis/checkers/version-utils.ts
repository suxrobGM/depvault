import type { DependencyStatus } from "@/generated/prisma";

export interface VersionResult {
  name: string;
  latestVersion: string | null;
  status: DependencyStatus;
  license: string | null;
}

export interface DependencyInput {
  name: string;
  currentVersion: string;
}

export interface RegistryResult {
  version: string | null;
  deprecated: boolean;
  license: string | null;
}

export function cleanVersion(version: string): string {
  return version
    .replace(/^[~^>=<!*\s]+/, "")
    .split(",")[0]!
    .trim();
}

function parseSemver(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [parseInt(match[1]!, 10), parseInt(match[2] ?? "0", 10), parseInt(match[3] ?? "0", 10)];
}

export function compareVersions(
  current: string,
  latest: string,
  deprecated: boolean,
): DependencyStatus {
  if (deprecated) return "DEPRECATED";

  const currentParts = parseSemver(cleanVersion(current));
  const latestParts = parseSemver(latest);

  if (!currentParts || !latestParts) return "UP_TO_DATE";

  if (latestParts[0] > currentParts[0]) return "MAJOR_UPDATE";
  if (latestParts[1] > currentParts[1]) return "MINOR_UPDATE";
  if (latestParts[2] > currentParts[2]) return "PATCH_UPDATE";
  return "UP_TO_DATE";
}

export async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i]!);
      } catch {
        results[i] = undefined as unknown as R;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
