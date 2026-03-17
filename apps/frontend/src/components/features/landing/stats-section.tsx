import type { ReactElement } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { GradientText } from "@/components/ui/cards";
import { SectionContainer } from "@/components/ui/containers";

const stats = [
  { value: "8+", label: "Ecosystems supported" },
  { value: "1 cmd", label: "To scan your entire repo" },
  { value: "AES-256", label: "Encryption standard" },
  { value: "3 OS", label: "macOS, Linux, Windows" },
];

export function StatsSection(): ReactElement {
  return (
    <Box component="section" sx={{ position: "relative" }}>
      <SectionContainer sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4} justifyContent="center">
          {stats.map((stat) => (
            <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <GradientText variant="h3" component="p" sx={{ mb: 0.5 }}>
                  {stat.value}
                </GradientText>
                <Typography variant="body2" color="text.secondary">
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
