import type { TypographyVariantsOptions } from "@mui/material/styles";

const DISPLAY_FONT = "var(--font-display), var(--font-geist-sans), sans-serif";

/** `text.secondary` baked in so muted body copy needs no per-call-site color. */
const MUTED_COLOR = "var(--mui-palette-text-secondary)";

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
  // subtitle1 is used as a card/section title — emphasized by default.
  subtitle1: { fontWeight: 600 },
  mono: {
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: "0.75rem",
  },
  // Emphasized small text (field labels, inline keys).
  label: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.43 },
  // Big tabular stat number; call sites set fontSize when not the default 1.25rem.
  statValue: { fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.2 },
  // Muted variants — identical metrics to their base, with text.secondary baked in.
  h6Muted: { fontSize: "1rem", fontWeight: 600, color: MUTED_COLOR },
  body1Muted: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5, color: MUTED_COLOR },
  body2Muted: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.43, color: MUTED_COLOR },
  captionMuted: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.66, color: MUTED_COLOR },
};
