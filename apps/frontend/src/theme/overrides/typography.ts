import type { Components, Theme } from "@mui/material/styles";

export const typographyOverrides: Components<Theme> = {
  MuiTypography: {
    defaultProps: {
      // Supplying variantMapping replaces MUI's default, so the standard variants
      // are repeated here alongside the custom ones to avoid falling back to <span>.
      variantMapping: {
        h1: "h1",
        h2: "h2",
        h3: "h3",
        h4: "h4",
        h5: "h5",
        h6: "h6",
        subtitle1: "h6",
        subtitle2: "h6",
        body1: "p",
        body2: "p",
        inherit: "p",
        label: "p",
        statValue: "p",
        h6Muted: "h6",
        body1Muted: "p",
        body2Muted: "p",
        mono: "span",
        captionMuted: "span",
      },
    },
  },
};
