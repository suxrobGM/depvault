import type { ReactElement } from "react";
import {
  CtaSection,
  EcosystemsSection,
  HeroSection,
  HowItWorksSection,
  LandingFeatureCards,
  StatsSection,
} from "@/components/features/landing";

export default function Home(): ReactElement {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <LandingFeatureCards />
      <EcosystemsSection />
      <StatsSection />
      <CtaSection />
    </>
  );
}
