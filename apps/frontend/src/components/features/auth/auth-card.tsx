import type { PropsWithChildren, ReactElement } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import Image from "next/image";

interface AuthCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function AuthCard(props: AuthCardProps): ReactElement {
  const { title, subtitle, children } = props;

  return (
    <Card className="vault-fade-up" sx={{ width: "100%", maxWidth: 440 }}>
      <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "vault.glowPrimary",
              mb: 2,
            }}
          >
            <Image src="/depvault-icon.svg" alt="" width={24} height={30} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}
