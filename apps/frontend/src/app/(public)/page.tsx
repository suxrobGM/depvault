import type { ReactElement } from "react";
import {
  CtaSection,
  EcosystemsSection,
  HeroSection,
  HowItWorksSection,
  LandingFeatureCards,
  SecuritySection,
  StatsSection,
} from "@/components/features/landing";

export default function Home(): ReactElement {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <LandingFeatureCards />
      <EcosystemsSection />
      <SecuritySection />
      <StatsSection />
      <CtaSection />
    </>
  );
}
