import type { ReactElement } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen(props: LoadingScreenProps): ReactElement {
  const { message } = props;

  return (
    <Box className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <CircularProgress />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
