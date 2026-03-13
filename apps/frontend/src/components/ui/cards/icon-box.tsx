import type { ReactElement, ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";

interface IconBoxProps {
  children: ReactNode;
  color: string;
  size?: number;
  sx?: SxProps<Theme>;
}

export function IconBox(props: IconBoxProps): ReactElement {
  const { children, color, size = 44, sx } = props;

  return (
    <Box
      sx={[
        {
          width: size,
          height: size,
          borderRadius: size <= 36 ? 1.5 : 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: `${color}1a`,
          color,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}
