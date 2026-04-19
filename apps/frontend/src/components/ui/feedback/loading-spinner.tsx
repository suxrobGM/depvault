import type { ReactElement } from "react";
import { CircularProgress, Stack, type SxProps, type Theme } from "@mui/material";

interface LoadingSpinnerProps {
  size?: number;
  py?: number;
  sx?: SxProps<Theme>;
}

/** Centered spinner for inline loading states (e.g., tab content, dialog bodies). */
export function LoadingSpinner(props: LoadingSpinnerProps): ReactElement {
  const { size, py = 8, sx } = props;

  return (
    <Stack
      sx={{
        alignItems: "center",
        justifyContent: "center",
        py,
        ...sx,
      }}
    >
      <CircularProgress size={size} />
    </Stack>
  );
}
