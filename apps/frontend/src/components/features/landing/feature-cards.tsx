import type { ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { SectionContainer } from "@/components/ui/section-container";
import { FeatureAnalysis } from "./feature-analysis";
import { FeatureSharing } from "./feature-sharing";
import { FeatureVault } from "./feature-vault";

export function LandingFeatureCards(): ReactElement {
  return (
    <Box component="section" id="features" sx={{ position: "relative" }}>
      <SectionContainer sx={{ pt: { xs: 10, md: 16 } }}>
        <Typography variant="h2" textAlign="center" className="vault-fade-up" sx={{ mb: 1 }}>
          Everything you need to ship securely
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          className="vault-fade-up vault-delay-1"
          sx={{ mb: 8, maxWidth: 520, mx: "auto" }}
        >
          Three powerful tools, one unified platform
        </Typography>
        <Stack spacing={8}>
          <Box className="vault-fade-up vault-delay-2">
            <FeatureAnalysis />
          </Box>
          <Box className="vault-fade-up vault-delay-3">
            <FeatureVault />
          </Box>
          <Box className="vault-fade-up vault-delay-4">
            <FeatureSharing />
          </Box>
        </Stack>
      </SectionContainer>
    </Box>
  );
}
