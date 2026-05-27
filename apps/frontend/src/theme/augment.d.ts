import type { CSSProperties } from "@mui/material/styles";
import type { AppStyleTokens } from "./style-tokens";

declare module "@mui/material/styles" {
  interface Theme {
    app: AppStyleTokens;
  }
  interface ThemeOptions {
    app?: AppStyleTokens;
  }

  interface Palette {
    vault: {
      surface: string;
      glassBg: string;
      glassBorder: string;
      glowPrimary: string;
      glowSecondary: string;
    };
  }
  interface PaletteOptions {
    vault?: {
      surface?: string;
      glassBg?: string;
      glassBorder?: string;
      glowPrimary?: string;
      glowSecondary?: string;
    };
  }

  interface TypographyVariants {
    mono: CSSProperties;
    label: CSSProperties;
    statValue: CSSProperties;
    h6Muted: CSSProperties;
    body1Muted: CSSProperties;
    body2Muted: CSSProperties;
    captionMuted: CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
    label?: CSSProperties;
    statValue?: CSSProperties;
    h6Muted?: CSSProperties;
    body1Muted?: CSSProperties;
    body2Muted?: CSSProperties;
    captionMuted?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
    label: true;
    statValue: true;
    h6Muted: true;
    body1Muted: true;
    body2Muted: true;
    captionMuted: true;
  }
}
