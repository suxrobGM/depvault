import type { ReactElement, ReactNode } from "react";
import { CardContent, Typography } from "@mui/material";
import { IconBox } from "./icon-box";
import { Surface, type SurfaceAccent } from "./surface";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  accent?: SurfaceAccent;
}

export function FeatureCard(props: FeatureCardProps): ReactElement {
  const { icon, title, description, accent = "primary" } = props;
  const accentColor = `var(--mui-palette-${accent}-main)`;

  return (
    <Surface accent={accent}>
      <CardContent sx={{ p: 3.5 }}>
        <IconBox
          color={accentColor}
          size={48}
          sx={{ mb: 2.5, "& .MuiSvgIcon-root": { fontSize: 24 } }}
        >
          {icon}
        </IconBox>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2Muted" sx={{ lineHeight: 1.7 }}>
          {description}
        </Typography>
      </CardContent>
    </Surface>
  );
}
