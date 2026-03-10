"use client";

import { createApiClient } from "@depvault/shared/api";
import { API_BASE_URL } from "./constants";
import { fetchWithRefresh } from "./fetch-with-refresh";

export const client = createApiClient(API_BASE_URL, {
  // Cast needed because Bun's `typeof fetch` includes a `preconnect` static
  // that a plain async function can't satisfy structurally.
  fetcher: fetchWithRefresh as typeof fetch,
  fetch: {
    credentials: "include",
  },
});
