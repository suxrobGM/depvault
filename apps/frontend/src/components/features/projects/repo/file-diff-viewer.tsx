"use client";

import { type ReactElement } from "react";
import { Box, Card, CardContent, CardHeader, Typography, useTheme } from "@mui/material";
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
  const showTitles = splitView && (oldTitle || newTitle);

  return (
    <Card
      variant="outlined"
      sx={{
        overflow: "hidden",
        fontSize: 13,
        "& pre": { fontFamily: "monospace" },
      }}
    >
      {showTitles && (
        <CardHeader
          disableTypography
          title={
            <Box sx={{ display: "flex" }}>
              <Typography variant="mono" sx={{ flex: 1, px: 1.5, py: 0.75 }}>
                {oldTitle}
              </Typography>
              <Typography
                variant="mono"
                sx={{
                  flex: 1,
                  px: 1.5,
                  py: 0.75,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                }}
              >
                {newTitle}
              </Typography>
            </Box>
          }
          sx={{
            p: 0,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
            "& .MuiCardHeader-content": { width: "100%" },
          }}
        />
      )}
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={splitView}
          compareMethod={DiffMethod.WORDS}
          useDarkTheme={isDark}
        />
      </CardContent>
    </Card>
  );
}
