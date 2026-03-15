import type { ReactElement } from "react";
import { BORDER_RADIUS, colors } from "./constants";

interface GlassCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  glowColor?: string;
}

export function GlassCard(props: GlassCardProps): ReactElement {
  const { children, style, glowColor } = props;

  return (
    <div
      style={{
        backgroundColor: colors.glassBg,
        border: `1px solid ${colors.glassBorder}`,
        borderRadius: BORDER_RADIUS,
        padding: 20,
        ...(glowColor && {
          boxShadow: `0 0 24px ${glowColor}26`,
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
