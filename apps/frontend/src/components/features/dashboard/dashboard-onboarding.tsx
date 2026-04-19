"use client";

import { useState, type ReactElement } from "react";
import {
  CheckCircle as CheckIcon,
  Download as DownloadIcon,
  CreateNewFolder as ProjectIcon,
  Share as ShareIcon,
  RadioButtonUnchecked as UncheckedIcon,
  CloudUpload as UploadIcon,
  VpnKey as VaultIcon,
} from "@mui/icons-material";
import { Box, CardContent, Stack, Typography } from "@mui/material";
import { GlassCard, GradientText } from "@/components/ui/cards";
import { useAuth } from "@/hooks/use-auth";

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    id: "create-project",
    icon: <ProjectIcon sx={{ fontSize: 20 }} />,
    title: "Create your first project",
    description: "Set up a project to organize dependencies, secrets, and secure files",
  },
  {
    id: "upload-deps",
    icon: <UploadIcon sx={{ fontSize: 20 }} />,
    title: "Upload a dependency file",
    description: "Scan package.json, requirements.txt, or any supported dependency file",
  },
  {
    id: "setup-vault",
    icon: <VaultIcon sx={{ fontSize: 20 }} />,
    title: "Set up your environment vault",
    description:
      "Store encrypted environment variables and secret files (certs, keys, credentials)",
  },
  {
    id: "download-env",
    icon: <DownloadIcon sx={{ fontSize: 20 }} />,
    title: "Download .env.example",
    description: "Generate a template with placeholders for required variables",
  },
  {
    id: "share-secret",
    icon: <ShareIcon sx={{ fontSize: 20 }} />,
    title: "Share a secret",
    description: "Generate a one-time encrypted link to securely share credentials",
  },
];

function getStorageKey(userId: string): string {
  return `depvault-onboarding-${userId}`;
}

/**
 * Load completed steps from localStorage for the given user ID.
 * @param userId
 * @returns
 */
function loadCompleted(userId: string | undefined): Set<string> {
  if (typeof window === "undefined" || !userId) {
    return new Set();
  }

  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    /* ignore parse errors */
  }
  return new Set();
}

export function DashboardOnboarding(): ReactElement {
  const { user } = useAuth();

  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted(user?.id));

  const toggle = (id: string) => {
    if (!user?.id) {
      return;
    }

    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(getStorageKey(user.id), JSON.stringify([...next]));
      return next;
    });
  };

  const progress = steps.length > 0 ? Math.round((completed.size / steps.length) * 100) : 0;

  return (
    <GlassCard hoverGlow={false}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2.5,
          }}
        >
          <GradientText variant="h6" component="h2">
            Getting Started
          </GradientText>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            {progress}% complete
          </Typography>
        </Stack>
        <Box
          sx={{
            width: "100%",
            height: 4,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.06)",
            mb: 3,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: 2,
              background:
                "linear-gradient(90deg, var(--mui-palette-primary-main), var(--mui-palette-primary-light))",
              transition: "width 0.3s ease",
            }}
          />
        </Box>
        <Stack spacing={1.5}>
          {steps.map((step) => {
            const done = completed.has(step.id);
            return (
              <Box
                key={step.id}
                onClick={() => toggle(step.id)}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                }}
              >
                <Box sx={{ color: done ? "primary.main" : "text.secondary", mt: 0.25 }}>
                  {done ? (
                    <CheckIcon sx={{ fontSize: 22 }} />
                  ) : (
                    <UncheckedIcon sx={{ fontSize: 22 }} />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ color: done ? "text.secondary" : "text.primary" }}>{step.icon}</Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        textDecoration: done ? "line-through" : "none",
                        color: done ? "text.secondary" : "text.primary",
                      }}
                    >
                      {step.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      mt: 0.25,
                      display: "block",
                    }}
                  >
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </GlassCard>
  );
}
