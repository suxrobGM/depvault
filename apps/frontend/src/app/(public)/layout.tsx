import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { LandingFooter, LandingNavbar } from "@/components/features/landing";

export default function PublicLayout(props: PropsWithChildren): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <LandingNavbar />
      {props.children}
      <LandingFooter />
    </Box>
  );
}
