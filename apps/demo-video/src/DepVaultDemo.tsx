import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { colors } from "./components/constants";
import { CliCiScene } from "./scenes/cli/CliCiScene";
import { CliPullScene } from "./scenes/cli/CliPullScene";
import { CliPushScene } from "./scenes/cli/CliPushScene";
import { CliScanScene } from "./scenes/cli/CliScanScene";
import { ProjectFolderScene } from "./scenes/cli/ProjectFolderScene";
import { AnalysisScene } from "./scenes/dashboard/AnalysisScene";
import { CiTokenScene } from "./scenes/dashboard/CiTokenScene";
import { DashboardHomeScene } from "./scenes/dashboard/DashboardHomeScene";
import { SecretFilesScene } from "./scenes/dashboard/SecretFilesScene";
import { ShareLinkScene } from "./scenes/dashboard/ShareLinkScene";
import { VaultScene } from "./scenes/dashboard/VaultScene";
import { LogoScene } from "./scenes/LogoScene";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const SCENES = {
  cliScan: [0, 400],
  cliPush: [380, 660],
  cliPull: [640, 880],
  projectFolder: [860, 1080],
  dashHome: [1060, 1260],
  vault: [1240, 1470],
  analysis: [1450, 1670],
  shareLink: [1650, 1880],
  secretFiles: [1860, 2060],
  ciTokens: [2040, 2280],
  cliCi: [2260, 2500],
  logo: [2500, 2700],
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
      {/* CLI: Scan — frames 0-400 */}
      <Sequence from={SCENES.cliScan[0]} durationInFrames={SCENES.cliScan[1] - SCENES.cliScan[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliScan[0], SCENES.cliScan[1]) }}
        >
          <CliScanScene />
        </AbsoluteFill>
      </Sequence>

      {/* CLI: Push — frames 380-660 */}
      <Sequence from={SCENES.cliPush[0]} durationInFrames={SCENES.cliPush[1] - SCENES.cliPush[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliPush[0], SCENES.cliPush[1]) }}
        >
          <CliPushScene />
        </AbsoluteFill>
      </Sequence>

      {/* CLI: Pull — frames 640-880 */}
      <Sequence from={SCENES.cliPull[0]} durationInFrames={SCENES.cliPull[1] - SCENES.cliPull[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliPull[0], SCENES.cliPull[1]) }}
        >
          <CliPullScene />
        </AbsoluteFill>
      </Sequence>

      {/* CLI: Project Folder — frames 860-1080 */}
      <Sequence
        from={SCENES.projectFolder[0]}
        durationInFrames={SCENES.projectFolder[1] - SCENES.projectFolder[0]}
      >
        <AbsoluteFill
          style={{
            opacity: crossfadeOpacity(frame, SCENES.projectFolder[0], SCENES.projectFolder[1]),
          }}
        >
          <ProjectFolderScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Home — frames 1060-1260 */}
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

      {/* Dashboard: Vault — frames 1240-1470 */}
      <Sequence from={SCENES.vault[0]} durationInFrames={SCENES.vault[1] - SCENES.vault[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.vault[0], SCENES.vault[1]) }}
        >
          <VaultScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: Analysis — frames 1450-1670 */}
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

      {/* Dashboard: Share Link — frames 1650-1880 */}
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

      {/* Dashboard: Secret Files — frames 1860-2060 */}
      <Sequence
        from={SCENES.secretFiles[0]}
        durationInFrames={SCENES.secretFiles[1] - SCENES.secretFiles[0]}
      >
        <AbsoluteFill
          style={{
            opacity: crossfadeOpacity(frame, SCENES.secretFiles[0], SCENES.secretFiles[1]),
          }}
        >
          <SecretFilesScene />
        </AbsoluteFill>
      </Sequence>

      {/* Dashboard: CI Tokens — frames 2040-2280 */}
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

      {/* CLI: CI YAML — frames 2260-2500 */}
      <Sequence from={SCENES.cliCi[0]} durationInFrames={SCENES.cliCi[1] - SCENES.cliCi[0]}>
        <AbsoluteFill
          style={{ opacity: crossfadeOpacity(frame, SCENES.cliCi[0], SCENES.cliCi[1]) }}
        >
          <CliCiScene />
        </AbsoluteFill>
      </Sequence>

      {/* Logo/CTA — frames 2500-2700 */}
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
