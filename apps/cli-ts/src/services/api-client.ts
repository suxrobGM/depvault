import { createApiClient, type ApiClient } from "@depvault/shared/api";
import { CI_TOKEN_ENV_VAR } from "@/constants";
import { loadConfig } from "./config";
import { loadCredentials, saveCredentials } from "./credentials";

let clientInstance: ApiClient | null = null;

type FetcherFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * Returns a singleton instance of the API client, configured with authentication if available.
 */
export function getApiClient(): ApiClient {
  if (clientInstance) {
    return clientInstance;
  }

  const config = loadConfig();

  clientInstance = createApiClient(config.server, {
    fetcher: createAuthFetcher() as unknown as typeof fetch,
  });

  return clientInstance;
}

export function resetApiClient(): void {
  clientInstance = null;
}

function createAuthFetcher(): FetcherFn {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const token = resolveToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(input, { ...init, headers });

    if (response.status === 401 && !headers.has("X-Retry")) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        headers.set("Authorization", `Bearer ${refreshed}`);
        headers.set("X-Retry", "1");
        return fetch(input, { ...init, headers });
      }
    }

    return response;
  };
}

function resolveToken(): string | null {
  const ciToken = process.env[CI_TOKEN_ENV_VAR];
  if (ciToken) return ciToken;
  return loadCredentials()?.accessToken ?? null;
}

async function tryRefreshToken(): Promise<string | null> {
  const creds = loadCredentials();
  if (!creds?.refreshToken) return null;

  const config = loadConfig();

  try {
    const refreshClient = createApiClient(config.server, {
      fetcher: ((input: string | URL | Request, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set("Cookie", `refresh_token=${creds.refreshToken}`);
        return fetch(input, { ...init, headers });
      }) as unknown as typeof fetch,
    });

    const { data, error } = await refreshClient.api.auth.refresh.post();

    if (error || !data) {
      return null;
    }

    saveCredentials({
      ...creds,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });

    resetApiClient();
    return data.accessToken;
  } catch {
    return null;
  }
}
