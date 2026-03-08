import type { ReactElement } from "react";
import { Box, Grid, Skeleton, Stack } from "@mui/material";

export default function DashboardLoading(): ReactElement {
  return (
    <Box className="vault-fade-in">
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Skeleton variant="text" width={280} height={36} />
        <Skeleton variant="text" width={400} height={20} />
      </Stack>
      <Skeleton variant="text" width={120} height={28} sx={{ mb: 2 }} />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2.5 }} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2.5 }} />
    </Box>
  );
}
