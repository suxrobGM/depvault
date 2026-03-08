import type { ReactElement } from "react";
import { Box, Typography } from "@mui/material";

export default function Home(): ReactElement {
  return (
    <Box className="flex min-h-screen items-center justify-center">
      <Typography variant="h3" component="h1">
        DepVault
      </Typography>
    </Box>
  );
}
