import { Suspense, type ReactElement } from "react";
import { Box } from "@mui/material";
import { LandingFeatureCards } from "@/components/features/landing/feature-cards";
import { LandingFooter } from "@/components/features/landing/footer";
import { HeroSection } from "@/components/features/landing/hero-section";
import { LandingNavbar } from "@/components/features/landing/navbar";

export default function Home(): ReactElement {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <LandingNavbar />
      <HeroSection />
      <LandingFeatureCards />
      <Suspense>
        <LandingFooter />
      </Suspense>
    </Box>
  );
}
