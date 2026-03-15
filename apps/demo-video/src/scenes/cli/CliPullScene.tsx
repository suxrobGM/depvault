import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cli, colors, fade, fonts } from "../../components/constants";
import { Terminal } from "../../components/Terminal";
import { BlinkingCursor, Spinner, useTypingAnimation } from "../../components/TerminalTyping";

const FIGLET_BANNER = `  ____              __     __          _ _
 |  _ \\  ___ _ __   \\ \\   / /_ _ _   _| | |_
 | | | |/ _ \\ '_ \\   \\ \\ / / _\` | | | | | __|
 | |_| |  __/ |_) |   \\ V / (_| | |_| | | |_
 |____/ \\___| .__/     \\_/ \\__,_|\\__,_|_|\\__|
            |_|`;

const vaultGroups = [
  { name: "Root", checked: true },
  { name: "API Server", checked: true },
  { name: "Worker", checked: false },
];

export function CliPullScene(): ReactElement {
  const frame = useCurrentFrame();

  const terminalOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const terminalScale = interpolate(frame, [0, 15], [0.96, 1], { extrapolateRight: "clamp" });

  const command = "depvault pull env --environment production";
  const { charsVisible, done: typingDone } = useTypingAnimation(frame, 15, command, 0.8);

  const bannerAt = 45;
  const spinnerAt = 65;
  const selectAt = 85;
  const pullingAt = 120;
  const successAt = 150;
  const filesAt = 160;

  return (
    <AbsoluteFill
      style={{ backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}
    >
      <Terminal opacity={terminalOpacity} scale={terminalScale} minHeight={440}>
        {/* Command */}
        <div>
          <span style={{ color: colors.primary }}>~/my-app</span>
          <span style={{ color: cli.muted }}> $ </span>
          <span style={{ color: colors.textPrimary }}>{command.slice(0, charsVisible)}</span>
          <BlinkingCursor frame={frame} visible={!typingDone || frame < bannerAt} />
        </div>

        {/* Banner */}
        {frame >= bannerAt && (
          <div style={fade(frame, bannerAt)}>
            <pre
              style={{
                color: colors.primary,
                fontSize: 11,
                lineHeight: 1.2,
                margin: "14px 0 4px",
                fontFamily: fonts.mono,
              }}
            >
              {FIGLET_BANNER}
            </pre>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <span style={{ color: cli.grey }}>Secure your stack. Analyze. Vault. Ship.</span>
              {"  "}
              <span style={{ color: colors.primary }}>v1.3.0</span>
            </div>
          </div>
        )}

        {/* Status spinner */}
        {frame >= spinnerAt && frame < selectAt && (
          <div style={{ ...fade(frame, spinnerAt), display: "flex", alignItems: "center", gap: 8 }}>
            <Spinner frame={frame} color={cli.cyan} />
            <span>
              Pulling <span style={{ color: cli.cyan }}>(PRODUCTION)</span>...
            </span>
          </div>
        )}

        {/* Vault group selection */}
        {frame >= selectAt && (
          <div style={fade(frame, selectAt)}>
            <div style={{ color: cli.cyan, marginBottom: 6 }}>Select vault groups:</div>
            {vaultGroups.map((g, i) => {
              const showAt = selectAt + 6 + i * 5;
              if (frame < showAt) return null;
              return (
                <div key={g.name} style={{ ...fade(frame, showAt), marginLeft: 4 }}>
                  <span style={{ color: g.checked ? colors.primary : cli.grey }}>
                    {g.checked ? "[✓]" : "[ ]"}
                  </span>{" "}
                  <span style={{ color: g.checked ? colors.textPrimary : colors.textSecondary }}>
                    {g.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pulling spinner */}
        {frame >= pullingAt && frame < successAt && (
          <div
            style={{
              ...fade(frame, pullingAt),
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <Spinner frame={frame} color={cli.cyan} />
            <span>
              Pulling env vars for <span style={{ color: cli.cyan }}>Root</span>...
            </span>
          </div>
        )}

        {/* Success */}
        {frame >= successAt && (
          <div style={{ ...fade(frame, successAt), marginTop: 12 }}>
            <span style={{ color: colors.success }}>✔</span>{" "}
            <span style={{ color: colors.success }}>
              Pulled 2 env file(s) and 1 secret file(s).
            </span>
          </div>
        )}

        {/* File listing */}
        {frame >= filesAt && (
          <div style={{ ...fade(frame, filesAt), marginTop: 8 }}>
            <div style={{ color: cli.muted }}>
              ├── <span style={{ color: colors.success }}>.env</span>
            </div>
            <div style={{ color: cli.muted }}>
              └── <span style={{ color: colors.success }}>api/.env</span>
            </div>
          </div>
        )}
      </Terminal>
    </AbsoluteFill>
  );
}
