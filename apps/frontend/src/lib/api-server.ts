import { createApiClient } from "@depvault/shared/api";
import { cookies } from "next/headers";
import { API_BASE_URL, COOKIE_NAMES } from "./constants";

interface GetServerClientOptions {
  auth?: boolean;
}

/**
 * Creates an API client instance for server-side use,
 * optionally including the access token from cookies for authentication.
 * @param options Configuration options for the server client
 * @returns An instance of Eden Treaty API client configured for server-side use
 */
export async function getServerClient(options: GetServerClientOptions = {}) {
  const { auth = true } = options;
  if (!auth) {
    return createApiClient(API_BASE_URL);
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.accessToken)?.value;

  return createApiClient(API_BASE_URL, {
    headers: {
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
  });
}
