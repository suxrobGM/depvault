import type { RepoMapAppDto } from "@/types/api/repo";

/** Sentinel env-filter value meaning "show files from every environment". */
export const ALL_ENVIRONMENTS = "__all__";

/**
 * Narrow apps to the files matching the env filter and search query. An app keeps a
 * file when the env matches AND (the query matches the app name OR the file path).
 * Apps with no surviving files are dropped. Shared by the explorer (rendering) and
 * the browser (deriving the fallback selection).
 */
export function filterApps(
  apps: RepoMapAppDto[],
  envFilter: string,
  search: string,
): RepoMapAppDto[] {
  const query = search.trim().toLowerCase();

  return apps
    .map((app) => {
      const appNameMatch = query === "" || app.name.toLowerCase().includes(query);
      const files = app.files.filter((file) => {
        const envMatch = envFilter === ALL_ENVIRONMENTS || file.environmentSlug === envFilter;
        const searchMatch = appNameMatch || file.relativePath.toLowerCase().includes(query);
        return envMatch && searchMatch;
      });
      return { ...app, files };
    })
    .filter((app) => app.files.length > 0);
}
