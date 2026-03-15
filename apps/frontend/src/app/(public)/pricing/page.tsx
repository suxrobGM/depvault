import type { ReactElement } from "react";
import { Box } from "@mui/material";
import { PricingSection } from "@/components/features/landing";

export default function PricingPage(): ReactElement {
  return (
    <Box component="section" id="pricing" sx={{ pt: 12, position: "relative" }}>
      <PricingSection />
    </Box>
  );
}
