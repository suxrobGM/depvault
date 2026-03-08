import type { ReactElement } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { SectionContainer } from "@/components/ui/section-container";
import { ROUTES } from "@/lib/constants";

export function HeroSection(): ReactElement {
  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      <Box className="vault-dot-grid" />
      <SectionContainer sx={{ pt: { xs: 16, md: 20 }, pb: { xs: 8, md: 12 } }}>
        <Stack alignItems="center" textAlign="center" spacing={3}>
          <Box className="vault-fade-up">
            <GradientText variant="h1" component="h1" animated>
              Secure your stack.
            </GradientText>
            <Typography variant="h1" component="span" sx={{ display: "block", mt: 0.5 }}>
              Analyze. Vault. Ship.
            </Typography>
          </Box>

          <Typography
            variant="h6"
            color="text.secondary"
            fontWeight={400}
            maxWidth={600}
            className="vault-fade-up vault-delay-1"
          >
            Analyze dependencies, detect vulnerabilities, and securely store environment variables
            across any tech stack — all in one place.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            className="vault-fade-up vault-delay-2"
            sx={{ mt: 2 }}
          >
            <Link href={ROUTES.register} style={{ textDecoration: "none" }}>
              <Button variant="contained" size="large" sx={{ px: 4 }}>
                Get Started
              </Button>
            </Link>
            <Link href="#features" style={{ textDecoration: "none" }}>
              <Button variant="outlined" size="large" sx={{ px: 4 }}>
                Learn More
              </Button>
            </Link>
          </Stack>
        </Stack>
      </SectionContainer>
    </Box>
  );
}
