import type { ReactElement, ReactNode } from "react";
import {
  Code as CodeIcon,
  Key as KeyIcon,
  Shield as ShieldIcon,
  VisibilityOff as ZeroKnowledgeIcon,
} from "@mui/icons-material";
import { Box, CardContent, Grid, Typography } from "@mui/material";
import { GlassCard, GradientText, IconBox } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";

interface TrustCard {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

const trustCards: TrustCard[] = [
  {
    icon: <ZeroKnowledgeIcon />,
    title: "Zero-Knowledge",
    description:
      "Your vault password never leaves your device. Encryption keys are derived locally with PBKDF2-SHA256 — we never see them.",
    color: "var(--mui-palette-primary-main)",
  },
  {
    icon: <ShieldIcon />,
    title: "End-to-End Encrypted",
    description:
      "All secrets are encrypted with AES-256-GCM in your browser before they reach the server. Even we can't read your data.",
    color: "#f59e0b",
  },
  {
    icon: <CodeIcon />,
    title: "Open Source",
    description:
      "The full codebase is open on GitHub. Audit the encryption implementation, verify our claims, and contribute.",
    color: "#22d3ee",
  },
  {
    icon: <KeyIcon />,
    title: "Recovery Without Backdoors",
    description:
      "If you forget your password, your recovery key restores access. There are no master keys and no server-side backdoors.",
    color: "#a78bfa",
  },
];

export function SecuritySection(): ReactElement {
  return (
    <Box component="section" id="security" sx={{ position: "relative" }}>
      <SectionContainer sx={{ py: { xs: 8, md: 12 } }}>
        <Typography
          variant="h2"
          className="vault-fade-up"
          sx={{
            textAlign: "center",
            mb: 1,
          }}
        >
          Built on{" "}
          <GradientText variant="h2" component="span" animated>
            zero trust
          </GradientText>
        </Typography>
        <Typography
          variant="body1"
          className="vault-fade-up vault-delay-1"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            mb: 6,
            maxWidth: 520,
            mx: "auto",
          }}
        >
          Your secrets are encrypted before they leave your browser. The server stores only
          ciphertext — it can never decrypt your data.
        </Typography>
        <Grid container spacing={3}>
          {trustCards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <GlassCard glowColor={card.color} sx={{ height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <IconBox color={card.color} sx={{ mb: 2 }}>
                    {card.icon}
                  </IconBox>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      mb: 0.5,
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.7,
                    }}
                  >
                    {card.description}
                  </Typography>
                </CardContent>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </SectionContainer>
    </Box>
  );
}
