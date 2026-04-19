import type { ReactElement } from "react";
import {
  CloudDownload as PullIcon,
  CloudUpload as PushIcon,
  BugReport as ScanIcon,
  Terminal as TerminalIcon,
} from "@mui/icons-material";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { GlassCard, GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";

const steps = [
  {
    number: "01",
    icon: <TerminalIcon sx={{ fontSize: 28 }} />,
    title: "Install",
    description:
      "Install the CLI with a single command. Works on macOS, Linux, and Windows — Native AOT binary, no runtime needed.",
  },
  {
    number: "02",
    icon: <ScanIcon sx={{ fontSize: 28 }} />,
    title: "Scan",
    description:
      "Run depvault scan in your repo to analyze dependencies, detect vulnerabilities, find leaked secrets, and discover env files — all at once.",
  },
  {
    number: "03",
    icon: <PushIcon sx={{ fontSize: 28 }} />,
    title: "Push",
    description:
      "Push .env files and secret keys to the encrypted vault. Pick environments per file — development, staging, production — in one interactive flow.",
  },
  {
    number: "04",
    icon: <PullIcon sx={{ fontSize: 28 }} />,
    title: "Pull",
    description:
      "Teammates pull secrets with depvault pull. CI/CD pipelines use scoped tokens. No .env files in Slack, no secrets in git.",
  },
];

export function HowItWorksSection(): ReactElement {
  return (
    <Box component="section" id="how-it-works" sx={{ position: "relative", height: "100%" }}>
      <SectionContainer>
        <Typography
          variant="h2"
          sx={{
            textAlign: "center",
            mb: 1,
          }}
        >
          How it works
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            mb: 6,
            maxWidth: 500,
            mx: "auto",
          }}
        >
          From install to secure in four CLI commands
        </Typography>
        <Grid container spacing={4}>
          {steps.map((step, i) => (
            <Grid key={step.number} size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack
                sx={{
                  alignItems: "center",
                  position: "relative",
                  height: "100%",
                }}
              >
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.7,
                    }}
                  >
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
