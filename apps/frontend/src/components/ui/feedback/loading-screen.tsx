import type { ReactElement } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

interface LoadingScreenProps {
  message?: string;
}

/**
 * A full-page loading screen for longer loading states (e.g., initial app load, project switch).
 */
export function LoadingScreen(props: LoadingScreenProps): ReactElement {
  const { message } = props;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "50vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress />
      {message && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
