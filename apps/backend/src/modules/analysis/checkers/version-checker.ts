import type { Ecosystem } from "@/generated/prisma";
import { fetchNpmVersion } from "./npm-version-checker";
import { fetchPypiVersion } from "./pypi-version-checker";
import {
  compareVersions,
  runWithConcurrency,
  type DependencyInput,
  type RegistryResult,
  type VersionResult,
} from "./version-utils";

const CONCURRENCY_LIMIT = 10;

const REGISTRY_FETCHERS: Partial<Record<Ecosystem, (name: string) => Promise<RegistryResult>>> = {
  NODEJS: fetchNpmVersion,
  PYTHON: fetchPypiVersion,
};

export async function checkVersions(
  dependencies: DependencyInput[],
  ecosystem: Ecosystem,
): Promise<VersionResult[]> {
  const fetcher = REGISTRY_FETCHERS[ecosystem];
  if (!fetcher) {
    return [];
  }

  return runWithConcurrency(
    dependencies,
    async (dep) => {
      const { version: latestVersion, deprecated } = await fetcher(dep.name);
      return {
        name: dep.name,
        latestVersion,
        status: latestVersion
          ? compareVersions(dep.currentVersion, latestVersion, deprecated)
          : ("UP_TO_DATE" as const),
      };
    },
    CONCURRENCY_LIMIT,
  );
}
