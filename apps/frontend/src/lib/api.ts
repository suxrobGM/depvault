"use client";

import { createApiClient } from "@depvault/shared/api";
import { API_BASE_URL } from "./constants";

export const client = createApiClient(API_BASE_URL, {
  fetch: {
    credentials: "include",
  },
});
