import type { PropsWithChildren, ReactElement } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { SectionContainer } from "@/components/ui/containers";

interface LegalPageProps extends PropsWithChildren {
  title: string;
  lastUpdated: string;
}

export function LegalPage(props: LegalPageProps): ReactElement {
  return (
    <Box sx={{ pb: 4 }}>
      <SectionContainer sx={{ maxWidth: 800 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
          {props.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: {props.lastUpdated}
        </Typography>
        <Divider sx={{ mb: 4 }} />
        <Stack spacing={4}>{props.children}</Stack>
      </SectionContainer>
    </Box>
  );
}

export function LegalSection(props: { title: string } & PropsWithChildren): ReactElement {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {props.title}
      </Typography>
      {props.children}
    </Stack>
  );
}

export function LegalParagraph(props: PropsWithChildren): ReactElement {
  return (
    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
      {props.children}
    </Typography>
  );
}
