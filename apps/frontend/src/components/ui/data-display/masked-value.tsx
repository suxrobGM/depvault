"use client";

import { useState, type ReactElement } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, Stack, Typography } from "@mui/material";

interface MaskedValueProps {
  value: string;
  maskChar?: string;
}

export function MaskedValue(props: MaskedValueProps): ReactElement {
  const { value, maskChar = "\u2022" } = props;
  const [visible, setVisible] = useState(false);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: "center",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontFamily: "monospace",
          userSelect: visible ? "text" : "none",
        }}
      >
        {visible ? value : maskChar.repeat(12)}
      </Typography>
      <IconButton size="small" onClick={() => setVisible((v) => !v)} aria-label="Toggle visibility">
        {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </Stack>
  );
}
