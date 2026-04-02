import { writeFileSync } from "node:fs";
import type { ReactElement } from "react";
import { decrypt } from "@depvault/crypto";
import { serializeConfig, type ConfigFormat } from "@depvault/shared";
import type { ConfigEntry } from "@depvault/shared/serializers";
import { Box, Text } from "ink";
import { getApiClient } from "@/services/api-client";
import { AuthMode, getAuthMode } from "@/services/auth";
import { resolveDek } from "@/services/dek-resolver";
import { ErrorBox } from "@/ui/error-box";
import { Success } from "@/ui/success";
import { getFlag } from "@/utils/args";

export default async function handler(args: string[]): Promise<ReactElement> {
  if (getAuthMode() !== AuthMode.CiToken) {
    return <ErrorBox message="ci pull requires DEPVAULT_TOKEN to be set." />;
  }

  const format = (getFlag(args, "format") ?? "env") as ConfigFormat;
  const outputPath = getFlag(args, "output");

  const client = getApiClient();
  const { data, error } = await client.api.ci.secrets.get();

  if (error || !data) {
    return <ErrorBox message="Failed to fetch CI secrets." />;
  }

  const ciData = data as any;

  if (!ciData.wrappedDek) {
    return <ErrorBox message="No wrapped DEK found in CI secrets response." />;
  }

  const dek = await resolveDek("", null);
  const variables: any[] = ciData.variables ?? [];

  const entries: ConfigEntry[] = [];
  for (const v of variables) {
    const value = await decrypt(v.encryptedValue, v.iv, v.authTag, dek);
    entries.push({ key: v.key, value });
  }

  const serialized = serializeConfig(format, entries);

  if (outputPath) {
    writeFileSync(outputPath, serialized);
    return <Success message={`Wrote ${entries.length} variables to ${outputPath}`} />;
  }

  // Output to stdout for piping
  return (
    <Box flexDirection="column">
      <Text>{serialized}</Text>
    </Box>
  );
}
