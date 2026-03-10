import type { ReactElement, ReactNode } from "react";
import { Box, Typography } from "@mui/material";

interface BrowserWindowProps {
  title: string;
  children?: ReactNode;
}

export function BrowserWindow(props: BrowserWindowProps): ReactElement {
  const { title, children } = props;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "vault.glassBorder",
        }}
      >
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "error.main" }} />
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "warning.main" }} />
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main" }} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      {children}
    </>
  );
}
