import type { ReactElement } from "react";
import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import { colors } from "./theme";

interface SpinnerProps {
  label: string;
}

export function Spinner(props: SpinnerProps): ReactElement {
  return (
    <Box gap={1}>
      <Text color={colors.brand}>
        <InkSpinner type="dots" />
      </Text>
      <Text>{props.label}</Text>
    </Box>
  );
}
