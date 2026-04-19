import type { ReactElement } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";

const stats = [
  { value: "9+", label: "Ecosystems supported" },
  { value: "Zero-Knowledge", label: "Server never sees your secrets" },
  { value: "AES-256-GCM", label: "End-to-end encryption" },
  { value: "Open Source", label: "Fully auditable codebase" },
];

export function StatsSection(): ReactElement {
  return (
    <Box component="section" sx={{ position: "relative" }}>
      <SectionContainer sx={{ py: { xs: 4, md: 6 } }}>
        <Grid
          container
          spacing={4}
          sx={{
            justifyContent: "center",
          }}
        >
          {stats.map((stat) => (
            <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <GradientText variant="h3" component="p" sx={{ mb: 0.5 }}>
                  {stat.value}
                </GradientText>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionContainer>
    </Box>
  );
}
