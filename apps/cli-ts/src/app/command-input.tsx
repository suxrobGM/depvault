import { useState, type ReactElement } from "react";
import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";
import { COMMANDS } from "@/app/command-router";
import { colors } from "@/ui/theme";

const COMMAND_ENTRIES = Object.entries(COMMANDS).map(([name, meta]) => ({
  name: `/${name}`,
  description: meta.description,
}));

interface CommandInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
}

export function CommandInput(props: CommandInputProps): ReactElement {
  const { onSubmit, disabled } = props;
  const [input, setInput] = useState("");

  const showSuggestions = input.startsWith("/") && !input.includes(" ");
  const filtered = showSuggestions
    ? COMMAND_ENTRIES.filter((cmd) => cmd.name.startsWith(input) && cmd.name !== input)
    : [];

  const handleSubmit = (value: string) => {
    setInput("");
    onSubmit(value);
  };

  return (
    <Box flexDirection="column">
      {filtered.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {filtered.slice(0, 10).map((cmd) => (
            <Box key={cmd.name} gap={2}>
              <Box width={22}>
                <Text color={colors.brand}>{cmd.name}</Text>
              </Box>
              <Text color={colors.muted}>{cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}
      <Box>
        <Text color={colors.brand} bold>
          depvault{">"}{" "}
        </Text>
        {disabled ? (
          <Text color={colors.muted}>running...</Text>
        ) : (
          <TextInput
            placeholder="Type a /command..."
            suggestions={COMMAND_ENTRIES.map((c) => c.name)}
            onChange={setInput}
            onSubmit={handleSubmit}
          />
        )}
      </Box>
    </Box>
  );
}
