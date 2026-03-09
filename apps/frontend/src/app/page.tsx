import type { ReactElement } from "react";
import { Box } from "@mui/material";
import {
  CtaSection,
  EcosystemsSection,
  HeroSection,
  HowItWorksSection,
  LandingFeatureCards,
  LandingFooter,
  LandingNavbar,
  StatsSection,
} from "@/components/features/landing";

export default function Home(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <LandingNavbar />
      <HeroSection />
      <HowItWorksSection />
      <LandingFeatureCards />
      <EcosystemsSection />
      <StatsSection />
      <CtaSection />
      <LandingFooter />
    </Box>
  );
}
