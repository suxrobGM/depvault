import type { ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Box, Container, Paper, Typography } from "@mui/material";
import { SecretAccessView } from "@/components/features/shared-secret/secret-access-view";
import { getServerClient } from "@/lib/api-server";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedSecretPage(props: PageProps): Promise<ReactElement> {
  const { token } = await props.params;

  const apiClient = await getServerClient({ auth: false });
  const { data: info, error } = await apiClient.api.secrets.shared({ token }).info.get();
  const errorMessage = error?.value.message;

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <LockIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
        <Typography variant="h5" fontWeight={700}>
          DepVault — Secure Share
        </Typography>
        <Typography variant="body2" color="text.secondary">
          One-time encrypted secret delivery
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        {errorMessage ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography color="error" fontWeight={500} gutterBottom>
              Link unavailable
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {errorMessage}
            </Typography>
          </Box>
        ) : (
          <SecretAccessView token={token} info={info!} />
        )}
      </Paper>
    </Container>
  );
}
