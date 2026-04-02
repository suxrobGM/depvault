import type { ReactElement, ReactNode } from "react";
import { Box, Text } from "ink";
import { colors } from "./theme";

interface PanelProps {
  title?: string;
  children: ReactNode;
  borderColor?: string;
}

export function Panel(props: PanelProps): ReactElement {
  const { title, children, borderColor = colors.muted } = props;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={1}>
      {title && (
        <Text color={colors.highlight} bold>
          {title}
        </Text>
      )}
      {children}
    </Box>
  );
}
