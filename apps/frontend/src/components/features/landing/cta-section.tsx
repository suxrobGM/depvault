import type { ReactElement } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { GlassCard, GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";
import { ROUTES } from "@/lib/constants";

export function CtaSection(): ReactElement {
  return (
    <Box component="section" sx={{ position: "relative" }}>
      <SectionContainer>
        <GlassCard
          hoverGlow={false}
          sx={{
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
            py: { xs: 6, md: 8 },
            px: { xs: 3, md: 6 },
          }}
        >
          <Box className="vault-gradient-mesh-alt" />
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <GradientText variant="h2" component="h2" animated sx={{ mb: 2 }}>
              Ready to secure your stack?
            </GradientText>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 1.5, maxWidth: 480, mx: "auto", lineHeight: 1.7 }}
            >
              Start analyzing dependencies and managing secrets in minutes. Free for individual
              developers, scalable for teams.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 4, display: "block" }}>
              No credit card required. Set up in under 2 minutes.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
              <Link href={ROUTES.register} style={{ textDecoration: "none" }}>
                <Button variant="contained" size="large" sx={{ px: 5 }}>
                  Get Started Free
                </Button>
              </Link>
              <Link href={ROUTES.login} style={{ textDecoration: "none" }}>
                <Button variant="outlined" size="large" sx={{ px: 5 }}>
                  Sign In
                </Button>
              </Link>
            </Stack>
          </Box>
        </GlassCard>
      </SectionContainer>
    </Box>
  );
}
