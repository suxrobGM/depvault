import type { ReactElement } from "react";
import {
  CtaSection,
  EcosystemsSection,
  FeatureCards,
  HeroSection,
  HowItWorksSection,
  SecuritySection,
  StatsSection,
} from "@/components/features/public";

export default function Home(): ReactElement {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeatureCards />
      <EcosystemsSection />
      <SecuritySection />
      <StatsSection />
      <CtaSection />
    </>
  );
}
