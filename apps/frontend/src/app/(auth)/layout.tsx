import type { PropsWithChildren, ReactElement } from "react";
import { Box, Container } from "@mui/material";

export default function AuthLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <Box
      className="flex min-h-screen items-center justify-center"
      sx={{ bgcolor: "background.default" }}
    >
      <Container maxWidth="sm">{children}</Container>
    </Box>
  );
}
