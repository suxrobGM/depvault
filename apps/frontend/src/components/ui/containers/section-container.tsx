import type { PropsWithChildren, ReactElement } from "react";
import { Container, type Breakpoint } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface SectionContainerProps extends PropsWithChildren {
  maxWidth?: Breakpoint;
  sx?: SxProps<Theme>;
}

export function SectionContainer(props: SectionContainerProps): ReactElement {
  const { maxWidth = "lg", sx, children } = props;

  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: { xs: 6, md: 10 },
        position: "relative",
        zIndex: 1,
        ...sx,
      }}
    >
      {children}
    </Container>
  );
}
