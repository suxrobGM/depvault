import type { ReactElement } from "react";
import { Box, Typography } from "@mui/material";

export default function DashboardPage(): ReactElement {
  return (
    <Box>
      <Typography variant="h4" component="h1">
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
        Welcome to DepVault. Your projects will appear here.
      </Typography>
    </Box>
  );
}
