import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { CliScene } from "./scenes/CliScene";
import { DashboardScene } from "./scenes/DashboardScene";

const syne = "'Syne', 'Inter', sans-serif";
const inter = "'Inter', 'Segoe UI', system-ui, sans-serif";

export const DepVaultDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const cliOpacity = interpolate(frame, [340, 360], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dashOpacity = interpolate(frame, [340, 360, 640, 660], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoOpacity = interpolate(frame, [640, 680], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [640, 700], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0e17" }}>
      {/* CLI Scene: frames 0-360 */}
      <Sequence durationInFrames={360}>
        <AbsoluteFill style={{ opacity: cliOpacity }}>
          <CliScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard Scene: frames 340-660 */}
      <Sequence from={340} durationInFrames={320}>
        <AbsoluteFill style={{ opacity: dashOpacity }}>
          <DashboardScene />
        </AbsoluteFill>
      </Sequence>

      {/* Logo/CTA: frames 640-750 */}
      <Sequence from={640} durationInFrames={110}>
        <AbsoluteFill
          style={{
            opacity: logoOpacity,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 16,
            transform: `scale(${logoScale})`,
          }}
        >
          {/* Glow background */}
          <div
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              fontFamily: syne,
              color: "#10b981",
              letterSpacing: -1,
              position: "relative",
            }}
          >
            DepVault
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#94a3b8",
              fontFamily: inter,
              fontWeight: 400,
              position: "relative",
            }}
          >
            Secure your stack. Analyze. Vault. Ship.
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
