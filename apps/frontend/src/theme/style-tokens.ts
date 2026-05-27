/**
 * Non-color design tokens that define DepVault's "glass" shell — geometry, depth,
 * blur, and glow. Color lives in the palette (including the `vault.*` tokens);
 * everything here is the surface language. Theme overrides read `theme.app.*`
 * instead of hardcoding radii, blur, and shadows, so the shell can be retuned in
 * one place.
 */
export interface AppStyleTokens {
  /** Base shape radius (cards, surfaces, inputs). */
  radius: number;
  /** Surface elevation tiers. */
  surface: {
    /** Page background (`background.default`). */
    base: string;
    /** Card / panel background (`background.paper`). */
    raised: string;
    /** Highest tier: menus, popovers, tooltips. */
    elevated: string;
  };
  /** Backdrop blur in px applied to glassy surfaces. 0 disables glassmorphism. */
  blur: number;
  /** Alpha for glassy surfaces (1 = fully opaque). */
  surfaceAlpha: number;
  /** Box-shadow scale. */
  shadow: {
    card: string;
    elevated: string;
  };
  /**
   * Accent glow applied on hover to accented / interactive surfaces. Builders
   * splice the accent color channel into the `{channel}` slot.
   */
  glow: {
    /** Radius/spread template, e.g. `0 0 24px rgba({channel} / 0.15)`. */
    hover: (channel: string) => string;
  };
}

/**
 * DepVault's locked visual direction: translucent glass surfaces over a deep navy
 * base, soft emerald glow on interaction, generous 10px radius.
 */
export const appStyleTokens: AppStyleTokens = {
  radius: 10,
  surface: { base: "#0a0e17", raised: "#0f1420", elevated: "#161c2e" },
  blur: 12,
  surfaceAlpha: 0.6,
  shadow: {
    card: "none",
    elevated: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  glow: {
    hover: (channel) => `0 0 24px rgba(${channel} / 0.15)`,
  },
};
