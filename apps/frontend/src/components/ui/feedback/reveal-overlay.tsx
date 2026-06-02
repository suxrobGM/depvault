"use client";

import { type ReactElement, type ReactNode } from "react";
import { Visibility } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";

interface RevealOverlayProps {
  blurred: boolean;
  onReveal: () => void;
  children: ReactNode;
  /** Optional caption shown under the reveal button (e.g. "Contains secrets"). */
  label?: string;
}

/**
 * Blurs its children behind a centered "Reveal" button until revealed. Generic
 * gate for sensitive content (e.g. secret file contents in a code editor). The blur
 * lives on a wrapper around the children — never the content itself — and is removed
 * entirely on reveal, so any interactivity inside is untouched once shown.
 */
export function RevealOverlay(props: RevealOverlayProps): ReactElement {
  const { blurred, onReveal, children, label } = props;

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          filter: blurred ? "blur(8px)" : "none",
          pointerEvents: blurred ? "none" : "auto",
          userSelect: blurred ? "none" : "auto",
          transition: "filter 0.15s ease",
        }}
      >
        {children}
      </Box>

      {blurred && (
        <Stack
          spacing={1}
          sx={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <Button variant="contained" startIcon={<Visibility />} onClick={onReveal}>
            Reveal contents
          </Button>
          {label && <Typography variant="captionMuted">{label}</Typography>}
        </Stack>
      )}
    </Box>
  );
}
