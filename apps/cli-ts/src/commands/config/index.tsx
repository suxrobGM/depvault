import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { loadConfig } from "@/services/config";
import { KeyValue } from "@/ui/key-value";
import { colors } from "@/ui/theme";

export default async function handler(_args: string[]): Promise<ReactElement> {
  const config = loadConfig();

  return (
    <Box flexDirection="column">
      <KeyValue label="server" value={config.server} />
      <KeyValue label="activeProjectId" value={config.activeProjectId ?? "(not set)"} />
      <KeyValue label="activeProjectName" value={config.activeProjectName ?? "(not set)"} />
      <KeyValue label="outputFormat" value={config.outputFormat} />
      <Text color={colors.muted}>
        {"\n"}Use /config set {"<key> <value>"} or /config get {"<key>"} to modify.
      </Text>
    </Box>
  );
}
