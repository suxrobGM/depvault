import type { PropsWithChildren, ReactElement } from "react";
import { Shield as ShieldIcon } from "@mui/icons-material";
import { Box, Container, Stack } from "@mui/material";
import Link from "next/link";
import { GradientText } from "@/components/ui/gradient-text";
import { ROUTES } from "@/lib/constants";

export default function AuthLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box className="vault-gradient-mesh" />
      <Box className="vault-dot-grid" />
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Stack alignItems="center" spacing={3}>
          <Link href={ROUTES.home} style={{ textDecoration: "none" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ShieldIcon sx={{ color: "primary.main", fontSize: 28 }} />
              <GradientText variant="h5" component="span">
                DepVault
              </GradientText>
            </Stack>
          </Link>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
