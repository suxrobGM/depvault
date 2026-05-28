import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { Footer, Navbar } from "@/components/features/public";

export default function PublicLayout(props: PropsWithChildren): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      {props.children}
      <Footer />
    </Box>
  );
}
