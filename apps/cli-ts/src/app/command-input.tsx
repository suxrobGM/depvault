import { useRef, useState, type ReactElement } from "react";
import { Box, Text, useInput } from "ink";
import { useCommandContext } from "@/app/command-context";
import { COMMANDS } from "@/app/command-router";
import { colors } from "@/ui/theme";

const COMMAND_ENTRIES = Object.entries(COMMANDS).map(([name, meta]) => ({
  name: `/${name}`,
  description: meta.description,
}));

const inverse = (s: string) => `\x1b[7m${s}\x1b[27m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
const BLOCK_CURSOR = "\u2588";

interface CommandInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
}

export function CommandInput(props: CommandInputProps): ReactElement {
  const { onSubmit, disabled } = props;
  const { promptMode: mode, submitPrompt } = useCommandContext();
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const matchedSuggestion = useRef<string | undefined>(undefined);

  const isPasswordMode = mode === "password";
  const isActive = !disabled || isPasswordMode;

  const suggestions =
    isActive && !isPasswordMode && value.startsWith("/") && !value.includes(" ")
      ? COMMAND_ENTRIES.filter((cmd) => cmd.name.startsWith(value) && cmd.name !== value)
      : [];
  matchedSuggestion.current = suggestions[0]?.name;

  useInput(
    (input, key) => {
      if (key.upArrow || key.downArrow || (key.ctrl && input === "c") || key.tab) return;

      if (key.return) {
        const submitted = value;
        setValue("");
        setCursor(0);
        isPasswordMode ? submitPrompt(submitted) : onSubmit(submitted);
        return;
      }

      if (key.rightArrow) {
        if (cursor === value.length && matchedSuggestion.current) {
          setValue(matchedSuggestion.current);
          setCursor(matchedSuggestion.current.length);
        } else {
          setCursor((c) => Math.min(c + 1, value.length));
        }
        return;
      }

      if (key.leftArrow) {
        setCursor((c) => Math.max(c - 1, 0));
        return;
      }

      if (key.backspace || key.delete) {
        if (cursor > 0) {
          setValue((v) => v.slice(0, cursor - 1) + v.slice(cursor));
          setCursor((c) => c - 1);
        }
        return;
      }

      if (input) {
        setValue((v) => v.slice(0, cursor) + input + v.slice(cursor));
        setCursor((c) => c + input.length);
      }
    },
    { isActive },
  );

  const renderInput = () => {
    const chars = isPasswordMode ? "*".repeat(value.length) : value;

    if (chars.length === 0) {
      if (isPasswordMode) return BLOCK_CURSOR;
      const ph = "Type a /command...";
      return inverse(ph[0]!) + dim(ph.slice(1));
    }

    let result = "";
    for (let i = 0; i < chars.length; i++) {
      result += i === cursor ? inverse(chars[i]!) : chars[i];
    }

    if (cursor === chars.length) {
      const hint = !isPasswordMode ? matchedSuggestion.current : undefined;
      if (hint) {
        const rest = hint.slice(value.length);
        result += inverse(rest[0]!) + dim(rest.slice(1));
      } else {
        result += BLOCK_CURSOR;
      }
    }

    return result;
  };

  return (
    <Box flexDirection="column">
      <Box>
        {isPasswordMode ? (
          <Text color={colors.highlight} bold>
            Vault password:{" "}
          </Text>
        ) : (
          <Text color={colors.brand} bold>
            depvault{">"}{" "}
          </Text>
        )}
        {disabled && !isPasswordMode ? (
          <Text color={colors.muted}>running...</Text>
        ) : (
          <Text>{renderInput()}</Text>
        )}
      </Box>
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {suggestions.slice(0, 10).map((cmd) => (
            <Box key={cmd.name} gap={2}>
              <Box width={22}>
                <Text color={colors.brand}>{cmd.name}</Text>
              </Box>
              <Text color={colors.muted}>{cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
