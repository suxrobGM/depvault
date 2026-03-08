import type { PropsWithChildren, ReactElement } from "react";
import { Typography, type TypographyProps } from "@mui/material";

interface GradientTextProps extends PropsWithChildren {
  variant?: TypographyProps["variant"];
  component?: React.ElementType;
  animated?: boolean;
  gradient?: string;
}

const DEFAULT_GRADIENT = "linear-gradient(135deg, #10b981, #34d399, #06b6d4)";

export function GradientText(props: GradientTextProps): ReactElement {
  const { variant = "h3", component, animated = false, gradient, children } = props;

  return (
    <Typography
      variant={variant}
      component={component ?? "span"}
      sx={{
        background: gradient ?? DEFAULT_GRADIENT,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        ...(animated && {
          backgroundSize: "200% 200%",
          animation: "gradientShift 3s ease infinite",
        }),
      }}
    >
      {children}
    </Typography>
  );
}
