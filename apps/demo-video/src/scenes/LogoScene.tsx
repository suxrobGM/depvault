import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../components/constants";

export function LogoScene(): ReactElement {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 60], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 16,
        transform: `scale(${scale})`,
      }}
    >
      {/* Glow background */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.glowPrimary} 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          fontFamily: fonts.display,
          color: colors.primary,
          letterSpacing: -1,
          position: "relative",
        }}
      >
        DepVault
      </div>
      <div
        style={{
          fontSize: 22,
          color: colors.textSecondary,
          fontFamily: fonts.body,
          fontWeight: 400,
          position: "relative",
        }}
      >
        Secure your stack. Analyze. Vault. Ship.
      </div>
    </AbsoluteFill>
  );
}
