import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { colors } from "./components/constants";
import { CliCiScene } from "./scenes/cli/CliCiScene";
import { CliPullScene } from "./scenes/cli/CliPullScene";
import { CliScanScene } from "./scenes/cli/CliScanScene";
import { AnalysisScene } from "./scenes/dashboard/AnalysisScene";
import { CiTokenScene } from "./scenes/dashboard/CiTokenScene";
import { DashboardHomeScene } from "./scenes/dashboard/DashboardHomeScene";
import { SecretFilesScene } from "./scenes/dashboard/SecretFilesScene";
import { ShareLinkScene } from "./scenes/dashboard/ShareLinkScene";
import { VaultScene } from "./scenes/dashboard/VaultScene";
import { LogoScene } from "./scenes/LogoScene";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Scene timeline: [start, end] in absolute frames
const SCENES = {
  cliScan: [0, 360],
  cliPull: [340, 550],
  cliCi: [530, 710],
  dashHome: [690, 840],
  analysis: [820, 970],
  vault: [950, 1100],
  secretFiles: [1080, 1200],
  shareLink: [1180, 1300],
  ciTokens: [1280, 1430],
  logo: [1430, 1620],
} as const;

const CROSSFADE = 20;

function crossfadeOpacity(frame: number, start: number, end: number): number {
  const fadeIn = interpolate(frame, [start, start + CROSSFADE], [0, 1], clamp);
  const fadeOut = interpolate(frame, [end - CROSSFADE, end], [1, 0], clamp);
  return Math.min(fadeIn, fadeOut);
}

export function DepVaultDemo(): ReactElement {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* CLI: Scan — frames 0-360 */}
      <Sequence from={SCENES.cliScan[0]} durationInFrames={SCENES.cliScan[1] - SCENES.cliScan[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliScan[0], SCENES.cliScan[1]) }}
        >
          <CliScanScene />
        </AbsoluteFill>
      </Sequence>

      {/* CLI: Pull — frames 340-550 */}
      <Sequence from={SCENES.cliPull[0]} durationInFrames={SCENES.cliPull[1] - SCENES.cliPull[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliPull[0], SCENES.cliPull[1]) }}
        >
          <CliPullScene />
        </AbsoluteFill>
      </Sequence>

      {/* CLI: CI YAML — frames 530-710 */}
      <Sequence from={SCENES.cliCi[0]} durationInFrames={SCENES.cliCi[1] - SCENES.cliCi[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliCi[0], SCENES.cliCi[1]) }}
        >
          <CliCiScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Home — frames 690-840 */}
      <Sequence
        from={SCENES.dashHome[0]}
        durationInFrames={SCENES.dashHome[1] - SCENES.dashHome[0]}
      >
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.dashHome[0], SCENES.dashHome[1]) }}
        >
          <DashboardHomeScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Analysis — frames 820-970 */}
      <Sequence
        from={SCENES.analysis[0]}
        durationInFrames={SCENES.analysis[1] - SCENES.analysis[0]}
      >
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.analysis[0], SCENES.analysis[1]) }}
        >
          <AnalysisScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Vault — frames 950-1100 */}
      <Sequence from={SCENES.vault[0]} durationInFrames={SCENES.vault[1] - SCENES.vault[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.vault[0], SCENES.vault[1]) }}
        >
          <VaultScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Secret Files — frames 1080-1200 */}
      <Sequence
        from={SCENES.secretFiles[0]}
        durationInFrames={SCENES.secretFiles[1] - SCENES.secretFiles[0]}
      >
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.secretFiles[0], SCENES.secretFiles[1]) }}
        >
          <SecretFilesScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Share Link — frames 1180-1300 */}
      <Sequence
        from={SCENES.shareLink[0]}
        durationInFrames={SCENES.shareLink[1] - SCENES.shareLink[0]}
      >
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.shareLink[0], SCENES.shareLink[1]) }}
        >
          <ShareLinkScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: CI Tokens — frames 1280-1430 */}
      <Sequence
        from={SCENES.ciTokens[0]}
        durationInFrames={SCENES.ciTokens[1] - SCENES.ciTokens[0]}
      >
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.ciTokens[0], SCENES.ciTokens[1]) }}
        >
          <CiTokenScene />
        </AbsoluteFill>
      </Sequence>

      {/* Logo/CTA — frames 1430-1620 */}
      <Sequence from={SCENES.logo[0]} durationInFrames={SCENES.logo[1] - SCENES.logo[0]}>
        <AbsoluteFill
          style={{
            opacity: interpolate(frame, [SCENES.logo[0], SCENES.logo[0] + 40], [0, 1], clamp),
          }}
        >
          <LogoScene />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
