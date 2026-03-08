"use client";

import type { ReactElement } from "react";
import { Shield as ShieldIcon } from "@mui/icons-material";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { GradientText } from "@/components/ui/gradient-text";
import { SectionContainer } from "@/components/ui/section-container";

export function LandingFooter(): ReactElement {
  return (
    <Box>
      <Divider />
      <SectionContainer sx={{ py: { xs: 4, md: 6 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <ShieldIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <GradientText variant="body1" component="span">
              DepVault
            </GradientText>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            &copy; {new Date().getFullYear()} DepVault. All rights reserved.
          </Typography>
        </Stack>
      </SectionContainer>
    </Box>
  );
}
