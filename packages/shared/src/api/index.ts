import type { App } from "@depvault/backend";
import { treaty } from "@elysiajs/eden";

export function createApiClient(
  baseUrl: string,
  options?: NonNullable<Parameters<typeof treaty<App>>[1]>,
) {
  return treaty<App>(baseUrl, options);
}

export type ApiClient = ReturnType<typeof createApiClient>;
