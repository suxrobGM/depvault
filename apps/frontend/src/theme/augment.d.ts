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
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}
