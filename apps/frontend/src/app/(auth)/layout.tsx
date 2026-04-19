import type { PropsWithChildren, ReactElement } from "react";
import { Box, Container, Stack } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function AuthLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "center",
        bgcolor: "background.default",
        position: "relative",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Box className="vault-gradient-mesh" />
      <Box className="vault-dot-grid" />
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1, py: { xs: 4, sm: 6 } }}>
        <Stack
          spacing={3}
          sx={{
            alignItems: "center",
          }}
        >
          <Link href={ROUTES.home} style={{ textDecoration: "none", display: "flex" }}>
            <Image src="/depvault-logo-dark.svg" alt="DepVault" width={150} height={43} priority />
          </Link>
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
