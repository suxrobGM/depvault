import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { colors } from "./theme";

interface ErrorBoxProps {
  message: string;
}

export function ErrorBox(props: ErrorBoxProps): ReactElement {
  return (
    <Box>
      <Text color={colors.error}>Error: </Text>
      <Text>{props.message}</Text>
    </Box>
  );
}
