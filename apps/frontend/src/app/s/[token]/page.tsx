import type { ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Container, Paper, Typography } from "@mui/material";
import { getServerClient } from "@/api/server";
import { ShareAccessView } from "@/components/features/share-link";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ShareLinkPage(props: PageProps): Promise<ReactElement> {
  const { token } = await props.params;

  const apiClient = await getServerClient({ auth: false });
  const { data: info, error } = await apiClient.api.shares({ token }).info.get();
  const errorMessage = error?.value.message;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <LockIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          DepVault — Secure Share
        </Typography>
        <Typography variant="body2Muted">One-time encrypted file delivery</Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        {errorMessage ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography color="error" gutterBottom sx={{ fontWeight: 500 }}>
              Link unavailable
            </Typography>
            <Typography variant="body2Muted">{errorMessage}</Typography>
          </Box>
        ) : (
          <ShareAccessView token={token} info={info!} />
        )}
      </Paper>
    </Container>
  );
}
