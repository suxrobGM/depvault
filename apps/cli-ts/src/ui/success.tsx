import type { ReactElement } from "react";
import { Text } from "ink";
import { colors } from "./theme";

interface SuccessProps {
  message: string;
}

export function Success(props: SuccessProps): ReactElement {
  return (
    <Text>
      <Text color={colors.success}>✓ </Text>
      <Text>{props.message}</Text>
    </Text>
  );
}
