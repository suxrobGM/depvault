"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useSubscription } from "@/hooks/use-subscription";
import { ROUTES } from "@/lib/constants";

export function ActivityUpgradeGate(props: PropsWithChildren): ReactElement {
  const { children } = props;
  const { limits, isLoading } = useSubscription();

  if (isLoading || (limits && limits.auditLogRetentionDays > 0)) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          filter: "blur(5px)",
          pointerEvents: "none",
          userSelect: "none",
          maxHeight: 500,
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
        aria-hidden
      >
        {children}
      </Box>
      <Stack
        spacing={2}
        sx={{
          alignItems: "center",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          textAlign: "center",
          px: 3,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.paper",
            boxShadow: 3,
          }}
        >
          <LockIcon sx={{ fontSize: 28, color: "text.secondary" }} />
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
          }}
        >
          Activity Logs
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            maxWidth: 400,
          }}
        >
          Activity logs track every action across your projects — variable changes, imports, shares,
          and more. Upgrade to Pro or Team to unlock audit logs.
        </Typography>
        <Button component={Link} href={ROUTES.billing} variant="contained">
          Upgrade Plan
        </Button>
      </Stack>
    </Box>
  );
}
