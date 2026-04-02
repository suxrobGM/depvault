import type { ReactElement, ReactNode } from "react";
import { Box, Text } from "ink";
import { colors } from "@/ui/theme";

export interface CommandOutput {
  id: number;
  command: string;
  content: ReactNode;
}

interface CommandAreaProps {
  outputs: CommandOutput[];
}

export function CommandArea(props: CommandAreaProps): ReactElement {
  const { outputs } = props;

  return (
    <Box flexDirection="column" gap={1}>
      {outputs.map((output) => (
        <Box key={output.id} flexDirection="column">
          <Text color={colors.muted}>
            {">"} /{output.command}
          </Text>
          {output.content}
        </Box>
      ))}
    </Box>
  );
}
