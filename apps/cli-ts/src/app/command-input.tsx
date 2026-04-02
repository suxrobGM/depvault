import type { ReactElement } from "react";
import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";
import { colors } from "@/ui/theme";

interface CommandInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
}

export function CommandInput(props: CommandInputProps): ReactElement {
  const { onSubmit, disabled } = props;

  return (
    <Box>
      <Text color={colors.brand} bold>
        depvault{">"}{" "}
      </Text>
      {disabled ? (
        <Text color={colors.muted}>running...</Text>
      ) : (
        <TextInput placeholder="Type a /command..." onSubmit={onSubmit} />
      )}
    </Box>
  );
}
