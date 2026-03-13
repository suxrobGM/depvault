import type { PropsWithChildren, ReactElement } from "react";
import { Card, type CardProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface GlassCardProps extends PropsWithChildren {
  glowColor?: string;
  hoverGlow?: boolean;
  sx?: SxProps<Theme>;
  onClick?: CardProps["onClick"];
  className?: string;
}

export function GlassCard(props: GlassCardProps): ReactElement {
  const { glowColor, hoverGlow = true, sx, onClick, className, children } = props;

  return (
    <Card
      onClick={onClick}
      className={className}
      sx={[
        onClick ? { cursor: "pointer" } : {},
        glowColor && hoverGlow
          ? {
              "&:hover": {
                borderColor: `${glowColor}33`,
                boxShadow: `0 0 24px ${glowColor}26`,
              },
            }
          : {},
        !hoverGlow
          ? {
              "&:hover": {
                borderColor: "divider",
                boxShadow: "none",
              },
            }
          : {},
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Card>
  );
}
