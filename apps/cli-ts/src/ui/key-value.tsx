import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { colors } from "./theme";

interface KeyValueProps {
  label: string;
  value: string;
}

export function KeyValue(props: KeyValueProps): ReactElement {
  return (
    <Box gap={1}>
      <Text color={colors.highlight}>{props.label}:</Text>
      <Text>{props.value}</Text>
    </Box>
  );
}
