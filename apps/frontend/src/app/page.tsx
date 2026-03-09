import { Suspense, type ReactElement } from "react";
import { Box } from "@mui/material";
import {
  CtaSection,
  EcosystemsSection,
  HeroSection,
  HowItWorksSection,
  LandingFeatureCards,
  LandingFooter,
  LandingNavbar,
} from "@/components/features/landing";

export default function Home(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <LandingNavbar />
      <HeroSection />
      <LandingFeatureCards />
      <HowItWorksSection />
      <EcosystemsSection />
      <CtaSection />
      <Suspense>
        <LandingFooter />
      </Suspense>
    </Box>
  );
}
