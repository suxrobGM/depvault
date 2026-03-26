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

const environments = [
  { name: "DEVELOPMENT", active: true },
  { name: "STAGING", active: false },
  { name: "PRODUCTION", active: false },
];

export function CliPushScene(): ReactElement {
  const frame = useCurrentFrame();

  const terminalOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const terminalScale = interpolate(frame, [0, 15], [0.96, 1], { extrapolateRight: "clamp" });

  const command = "depvault push env";
  const { charsVisible, done: typingDone } = useTypingAnimation(frame, 15, command);

  const bannerAt = 40;
  const scanAt = 60;
  const selectGroupAt = 80;
  const selectEnvAt = 110;
  const pushingAt = 135;
  const success1At = 160;
  const success2At = 175;
  const filesAt = 190;

  return (
    <AbsoluteFill
      style={{ backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}
    >
      <Terminal opacity={terminalOpacity} scale={terminalScale} minHeight={480}>
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

        {/* Scanning for env files */}
        {frame >= scanAt && frame < selectGroupAt && (
          <div style={{ ...fade(frame, scanAt), display: "flex", alignItems: "center", gap: 8 }}>
            <Spinner frame={frame} color={cli.cyan} />
            <span>
              Scanning for <span style={{ color: cli.cyan }}>.env</span> files...
            </span>
          </div>
        )}

        {/* Vault group selection */}
        {frame >= selectGroupAt && (
          <div style={fade(frame, selectGroupAt)}>
            <div style={{ color: cli.cyan, marginBottom: 6 }}>Select vault groups:</div>
            {vaultGroups.map((g, i) => {
              const showAt = selectGroupAt + 6 + i * 5;
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

        {/* Environment selection */}
        {frame >= selectEnvAt && (
          <div style={{ ...fade(frame, selectEnvAt), marginTop: 12 }}>
            <div style={{ color: cli.cyan, marginBottom: 6 }}>Select environment:</div>
            {environments.map((env, i) => {
              const showAt = selectEnvAt + 6 + i * 5;
              if (frame < showAt) return null;
              return (
                <div key={env.name} style={{ ...fade(frame, showAt), marginLeft: 4 }}>
                  <span style={{ color: env.active ? colors.primary : cli.grey }}>
                    {env.active ? "●" : "○"}
                  </span>{" "}
                  <span style={{ color: env.active ? colors.textPrimary : colors.textSecondary }}>
                    {env.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pushing spinner */}
        {frame >= pushingAt && frame < success1At && (
          <div
            style={{
              ...fade(frame, pushingAt),
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <Spinner frame={frame} color={cli.cyan} />
            <span>
              Pushing variables to <span style={{ color: cli.cyan }}>Root</span>...
            </span>
          </div>
        )}

        {/* Success 1 */}
        {frame >= success1At && (
          <div style={{ ...fade(frame, success1At), marginTop: 12 }}>
            <span style={{ color: colors.success }}>✔</span>{" "}
            <span>
              Pushed <span style={{ color: colors.primary }}>8</span> variables to{" "}
              <span style={{ color: cli.cyan }}>Root</span>{" "}
              <span style={{ color: cli.grey }}>(DEVELOPMENT)</span>
            </span>
          </div>
        )}

        {/* Success 2 */}
        {frame >= success2At && (
          <div style={fade(frame, success2At)}>
            <span style={{ color: colors.success }}>✔</span>{" "}
            <span>
              Pushed <span style={{ color: colors.primary }}>5</span> variables to{" "}
              <span style={{ color: cli.cyan }}>API Server</span>{" "}
              <span style={{ color: cli.grey }}>(DEVELOPMENT)</span>
            </span>
          </div>
        )}

        {/* Summary */}
        {frame >= filesAt && (
          <div style={{ ...fade(frame, filesAt), marginTop: 10 }}>
            <span style={{ color: colors.success }}>Done!</span>{" "}
            <span style={{ color: cli.grey }}>13 variables pushed from 2 vault group(s).</span>
          </div>
        )}
      </Terminal>
    </AbsoluteFill>
  );
}
