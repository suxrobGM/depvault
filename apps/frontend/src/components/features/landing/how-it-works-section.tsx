import type { ReactElement } from "react";
import {
  GitHub as ConnectIcon,
  BugReport as ScanIcon,
  Share as ShareIcon,
  Lock as StoreIcon,
} from "@mui/icons-material";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";

const steps = [
  {
    number: "01",
    icon: <ConnectIcon sx={{ fontSize: 28 }} />,
    title: "Connect",
    description:
      "Link your GitHub repo or upload dependency files from any ecosystem — package.json, requirements.txt, Cargo.toml, go.mod, and more.",
  },
  {
    number: "02",
    icon: <ScanIcon sx={{ fontSize: 28 }} />,
    title: "Scan",
    description:
      "Detect outdated packages, known CVEs, license conflicts, and secrets accidentally committed to your git history.",
  },
  {
    number: "03",
    icon: <StoreIcon sx={{ fontSize: 28 }} />,
    title: "Store",
    description:
      "Encrypt env variables and secret files — SSL certs, private keys, keystores, credentials — with AES-256-GCM in a zero-plaintext vault.",
  },
  {
    number: "04",
    icon: <ShareIcon sx={{ fontSize: 28 }} />,
    title: "Share",
    description:
      "Onboard teammates with setup checklists, share secrets via one-time encrypted links, and inject credentials into CI/CD pipelines.",
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
          From repo to secure in four simple steps
        </Typography>
        <Grid container spacing={4}>
          {steps.map((step, i) => (
            <Grid key={step.number} size={{ xs: 12, sm: 6, md: 3 }}>
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
