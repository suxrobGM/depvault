import type { ReactElement, ReactNode } from "react";
import { CardContent, Typography } from "@mui/material";
import { GlassCard } from "./glass-card";
import { IconBox } from "./icon-box";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  accentColor?: string;
}

export function FeatureCard(props: FeatureCardProps): ReactElement {
  const { icon, title, description, accentColor = "var(--mui-palette-primary-main)" } = props;

  return (
    <GlassCard glowColor={accentColor}>
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
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {description}
        </Typography>
      </CardContent>
    </GlassCard>
  );
}
