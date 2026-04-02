import type { ReactElement } from "react";
import { Box } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { loadCredentials } from "@/services/credentials";
import { ErrorBox } from "@/ui/error-box";
import { KeyValue } from "@/ui/key-value";

export default async function handler(_args: string[]): Promise<ReactElement> {
  const mode = getAuthMode();

  if (mode === AuthMode.None) {
    return <ErrorBox message="Not authenticated. Run /login first." />;
  }

  if (mode === AuthMode.CiToken) {
    return <KeyValue label="Auth" value="CI Token (DEPVAULT_TOKEN)" />;
  }

  const creds = loadCredentials();
  if (!creds) {
    return <ErrorBox message="No stored credentials found." />;
  }

  try {
    const client = getApiClient();
    const { data: user } = await client.api.users.me.get();

    return (
      <Box flexDirection="column">
        <KeyValue label="Email" value={user?.email ?? creds.email} />
        {user?.firstName && (
          <KeyValue label="Name" value={`${user.firstName} ${user.lastName ?? ""}`.trim()} />
        )}
        <KeyValue label="Auth" value="JWT (stored credentials)" />
      </Box>
    );
  } catch {
    return (
      <Box flexDirection="column">
        <KeyValue label="Email" value={creds.email} />
        <KeyValue label="Auth" value="JWT (stored credentials)" />
      </Box>
    );
  }
}
