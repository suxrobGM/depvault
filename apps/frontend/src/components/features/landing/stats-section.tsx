import type { ReactElement } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { GradientText } from "@/components/ui/gradient-text";
import { SectionContainer } from "@/components/ui/section-container";

const stats = [
  { value: "8+", label: "Ecosystems supported" },
  { value: "500+", label: "Packages per analysis" },
  { value: "AES-256", label: "Encryption standard" },
  { value: "<2s", label: "Dashboard load time" },
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
