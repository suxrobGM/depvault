"use client";

import { type ReactElement } from "react";
import { Box, useTheme } from "@mui/material";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

interface FileDiffViewerProps {
  oldValue: string;
  newValue: string;
  oldTitle?: string;
  newTitle?: string;
  splitView?: boolean;
}

/**
 * Git-style diff between two decrypted file revisions. Word-level highlighting,
 * theme-aware, side-by-side by default with a unified fallback.
 */
export function FileDiffViewer(props: FileDiffViewerProps): ReactElement {
  const { oldValue, newValue, oldTitle, newTitle, splitView = true } = props;
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        fontSize: 13,
        "& pre": { fontFamily: "monospace" },
      }}
    >
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={splitView}
        compareMethod={DiffMethod.WORDS}
        leftTitle={oldTitle}
        rightTitle={newTitle}
        useDarkTheme={isDark}
      />
    </Box>
  );
}
