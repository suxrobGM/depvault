import { Suspense, type ReactElement } from "react";
import { Box } from "@mui/material";
import { CtaSection } from "@/components/features/landing/cta-section";
import { EcosystemsSection } from "@/components/features/landing/ecosystems-section";
import { LandingFeatureCards } from "@/components/features/landing/feature-cards";
import { LandingFooter } from "@/components/features/landing/footer";
import { HeroSection } from "@/components/features/landing/hero-section";
import { HowItWorksSection } from "@/components/features/landing/how-it-works-section";
import { LandingNavbar } from "@/components/features/landing/navbar";

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
