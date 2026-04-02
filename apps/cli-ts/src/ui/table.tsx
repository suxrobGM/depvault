import type { ReactElement } from "react";
import { Box, Text } from "ink";
import { colors } from "./theme";

interface TableProps {
  headers: string[];
  rows: string[][];
}

export function Table(props: TableProps): ReactElement {
  const { headers, rows } = props;

  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
    return Math.max(h.length, maxData) + 2;
  });

  return (
    <Box flexDirection="column">
      <Box>
        {headers.map((h, i) => (
          <Box key={i} width={colWidths[i]}>
            <Text color={colors.highlight} bold>
              {h}
            </Text>
          </Box>
        ))}
      </Box>
      <Text color={colors.muted}>{colWidths.map((w) => "─".repeat(w)).join("─")}</Text>
      {rows.map((row, ri) => (
        <Box key={ri}>
          {row.map((cell, ci) => (
            <Box key={ci} width={colWidths[ci]}>
              <Text>{cell}</Text>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
