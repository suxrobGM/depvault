import type { TypographyVariantsOptions } from "@mui/material/styles";

const DISPLAY_FONT = "var(--font-display), var(--font-geist-sans), sans-serif";

export const typography: TypographyVariantsOptions = {
  fontFamily: "var(--font-geist-sans), sans-serif",
  h1: {
    fontFamily: DISPLAY_FONT,
    fontSize: "2.25rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontFamily: DISPLAY_FONT,
    fontSize: "1.875rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  h3: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em" },
  h4: { fontSize: "1.25rem", fontWeight: 600 },
  h5: { fontSize: "1.125rem", fontWeight: 600 },
  h6: { fontSize: "1rem", fontWeight: 600 },
  mono: {
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: "0.75rem",
  },
};
