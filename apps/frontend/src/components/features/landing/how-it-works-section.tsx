import type { ReactElement } from "react";
import {
  QueryStats as AnalyzeIcon,
  Shield as SecureIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientText } from "@/components/ui/gradient-text";
import { SectionContainer } from "@/components/ui/section-container";

const steps = [
  {
    number: "01",
    icon: <UploadIcon sx={{ fontSize: 28 }} />,
    title: "Upload",
    description:
      "Drop any dependency or config file — package.json, .env, Cargo.toml, requirements.txt, and more.",
  },
  {
    number: "02",
    icon: <AnalyzeIcon sx={{ fontSize: 28 }} />,
    title: "Analyze",
    description:
      "Instantly scan for outdated packages, known CVEs, license conflicts, and missing environment variables.",
  },
  {
    number: "03",
    icon: <SecureIcon sx={{ fontSize: 28 }} />,
    title: "Secure",
    description:
      "Encrypt secrets with AES-256-GCM, share via one-time links, and onboard teammates safely.",
  },
];

export function HowItWorksSection(): ReactElement {
  return (
    <Box component="section" id="how-it-works" sx={{ position: "relative", height: "100%" }}>
      <SectionContainer>
        <Typography variant="h2" textAlign="center" sx={{ mb: 1 }}>
          How it works
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 6, maxWidth: 500, mx: "auto" }}
        >
          From upload to secure in three simple steps
        </Typography>
        <Grid container spacing={4}>
          {steps.map((step, i) => (
            <Grid key={step.number} size={{ xs: 12, md: 4 }}>
              <Stack alignItems="center" sx={{ position: "relative", height: "100%" }}>
                {i < steps.length - 1 && (
                  <Box
                    sx={{
                      display: { xs: "none", md: "block" },
                      position: "absolute",
                      top: 32,
                      left: "calc(50% + 48px)",
                      width: "calc(100% - 48px)",
                      borderTop: "2px dashed",
                      borderColor: "vault.glassBorder",
                    }}
                  />
                )}
                <GlassCard
                  hoverGlow={false}
                  sx={{
                    width: "100%",
                    height: "100%",
                    textAlign: "center",
                    p: 3,
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      mx: "auto",
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))",
                      border: 1,
                      borderColor: "rgba(16, 185, 129, 0.2)",
                      color: "primary.main",
                    }}
                  >
                    {step.icon}
                  </Box>
                  <GradientText
                    variant="caption"
                    component="span"
                    sx={{ fontSize: "0.7rem", letterSpacing: "0.1em" }}
                  >
                    STEP {step.number}
                  </GradientText>
                  <Typography variant="h5" sx={{ mt: 1, mb: 1 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {step.description}
                  </Typography>
                </GlassCard>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </SectionContainer>
    </Box>
  );
}
