import type { PropsWithChildren, ReactElement } from "react";
import { Box } from "@mui/material";
import { LandingFooter, LandingNavbar } from "@/components/features/landing";

export default function PublicLayout(props: PropsWithChildren): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <LandingNavbar />
      <Box sx={{ pt: 12 }}>{props.children}</Box>
      <LandingFooter />
    </Box>
  );
}
