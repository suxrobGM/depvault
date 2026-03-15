import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const BANNER = `  ____            __     __          _ _
 |  _ \\  ___ _ __ \\ \\   / /_ _ _   _| | |_
 | | | |/ _ \\ '_ \\ \\ \\ / / _\` | | | | | __|
 | |_| |  __/ |_) | \\ V / (_| | |_| | | |_
 |____/ \\___| .__/   \\_/ \\__,_|\\__,_|_|\\__|
            |_|`;

const mono = "'JetBrains Mono', 'Fira Code', monospace";
const green = "#10b981";
const cyan = "#7dcfff";
const muted = "#636a80";
const text = "#a9b1d6";
const yellow = "#e0af68";

const fade = (frame: number, start: number, dur = 8) => ({
  opacity: interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }),
});

const ProgressLine: React.FC<{
  frame: number;
  startFrame: number;
  label: string;
  score: number;
  scoreColor: string;
}> = ({ frame, startFrame, label, score, scoreColor }) => {
  if (frame < startFrame) return null;
  const progress = interpolate(frame, [startFrame, startFrame + 25], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 26 }}>
      <span style={{ color: "#9ece6a", width: 16, textAlign: "center" }}>
        {progress >= 100 ? "\u2714" : "\u280B"}
      </span>
      <span style={{ width: 170, whiteSpace: "nowrap" }}>{label}</span>
      <div
        style={{
          width: 200,
          height: 6,
          backgroundColor: "#2a2e3f",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: green,
            borderRadius: 3,
          }}
        />
      </div>
      <span style={{ width: 44, textAlign: "right" }}>{Math.floor(progress)}%</span>
      <span style={{ color: scoreColor, width: 44, textAlign: "right", fontWeight: 600 }}>
        {score}%
      </span>
    </div>
  );
};

const SummaryTable: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const rows = [
    { label: "Dependencies analyzed", value: "47", color: text },
    { label: "Files analyzed", value: "3", color: text },
    { label: "Vulnerabilities found", value: "2", color: "#f7768e" },
    { label: "Env variables pushed", value: "12", color: "#9ece6a" },
    { label: "Secret leaks detected", value: "0", color: "#9ece6a" },
    { label: "Secret files uploaded", value: "1", color: text },
  ];

  const borderColor = "rgba(16,185,129,0.3)";

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        overflow: "hidden",
        width: 440,
        marginTop: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          backgroundColor: "rgba(16,185,129,0.08)",
          borderBottom: `1px solid ${borderColor}`,
          padding: "7px 18px",
          fontSize: 12,
          color: green,
          fontWeight: 700,
        }}
      >
        <span style={{ flex: 1 }}>METRIC</span>
        <span style={{ width: 80, textAlign: "right" }}>RESULT</span>
      </div>
      {rows.map((row, i) => {
        const rowFrame = startFrame + 10 + i * 5;
        if (frame < rowFrame) return null;
        const opacity = interpolate(frame, [rowFrame, rowFrame + 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={row.label}
            style={{
              display: "flex",
              padding: "6px 18px",
              borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              opacity,
              fontSize: 12,
            }}
          >
            <span style={{ flex: 1, color: "#94a3b8" }}>{row.label}</span>
            <span style={{ width: 80, textAlign: "right", color: row.color, fontWeight: 600 }}>
              {row.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const CliScene: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [340, 359], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const terminalOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const terminalScale = interpolate(frame, [0, 15], [0.96, 1], {
    extrapolateRight: "clamp",
  });

  const command = "depvault scan";
  const typingStart = 20;
  const charsVisible = Math.max(
    0,
    Math.min(Math.floor((frame - typingStart) * 0.6), command.length),
  );
  const typingDone = charsVisible >= command.length;
  const cursorBlink = frame % 30 < 15;

  const bannerAt = 50;
  const scanAt = 80;
  const headerAt = 95;
  const foundAt = 105;
  const treeAt = 112;
  const progressAt = 135;
  const tableAt = 205;
  const linkAt = 275;

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
        backgroundColor: "#0a0e17",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 1050,
          backgroundColor: "#1a1b26",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.05)",
          opacity: terminalOpacity,
          transform: `scale(${terminalScale})`,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            backgroundColor: "#16161e",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#febc2e",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#28c840",
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              color: muted,
              fontSize: 13,
              fontFamily: mono,
            }}
          >
            Terminal &mdash; depvault
          </div>
        </div>

        {/* Terminal content */}
        <div
          style={{
            padding: "22px 28px",
            fontFamily: mono,
            fontSize: 13.5,
            lineHeight: 1.75,
            color: text,
            minHeight: 540,
          }}
        >
          {/* Command */}
          <div>
            <span style={{ color: green }}>~/my-app</span>
            <span style={{ color: muted }}> $ </span>
            <span style={{ color: "#f1f5f9" }}>{command.slice(0, charsVisible)}</span>
            {frame < bannerAt && (
              <span style={{ color: green, opacity: !typingDone || cursorBlink ? 1 : 0 }}>
                {"\u258B"}
              </span>
            )}
          </div>

          {/* Banner */}
          {frame >= bannerAt && (
            <div style={fade(frame, bannerAt)}>
              <pre
                style={{
                  color: green,
                  fontSize: 11,
                  lineHeight: 1.2,
                  margin: "14px 0 4px",
                }}
              >
                {BANNER}
              </pre>
              <div style={{ color: muted, fontSize: 12, marginBottom: 10 }}>
                <span style={{ color: "#94a3b8" }}>Secure your stack. Analyze. Vault. Ship.</span>
                {"  "}
                <span style={{ color: green }}>v1.3.0</span>
              </div>
            </div>
          )}

          {/* Scanning */}
          {frame >= scanAt && (
            <div style={fade(frame, scanAt)}>
              <span style={{ color: cyan }}>Scanning:</span> ~/my-app
            </div>
          )}

          {/* Section header */}
          {frame >= headerAt && (
            <div style={{ ...fade(frame, headerAt), color: yellow, margin: "14px 0 6px" }}>
              {"━━━━━━━━"} Dependency Analysis {"━━━━━━━━"}
            </div>
          )}

          {/* Found files */}
          {frame >= foundAt && (
            <div style={fade(frame, foundAt)}>
              Found <span style={{ color: green }}>3</span> dependency file(s)
            </div>
          )}

          {/* File tree */}
          {frame >= treeAt && (
            <div style={fade(frame, treeAt, 12)}>
              <div style={{ color: muted }}>
                {"├── "}
                <span style={{ color: cyan }}>package.json</span>
              </div>
              <div style={{ color: muted }}>
                {"├── "}
                <span style={{ color: cyan }}>requirements.txt</span>
              </div>
              <div style={{ color: muted }}>
                {"└── "}
                <span style={{ color: cyan }}>go.mod</span>
              </div>
            </div>
          )}

          {/* Progress bars */}
          {frame >= progressAt && (
            <div style={{ ...fade(frame, progressAt), margin: "14px 0" }}>
              <ProgressLine
                frame={frame}
                startFrame={progressAt}
                label="package.json"
                score={92}
                scoreColor={green}
              />
              <ProgressLine
                frame={frame}
                startFrame={progressAt + 12}
                label="requirements.txt"
                score={78}
                scoreColor={yellow}
              />
              <ProgressLine
                frame={frame}
                startFrame={progressAt + 24}
                label="go.mod"
                score={85}
                scoreColor={green}
              />
            </div>
          )}

          {/* Summary table */}
          {frame >= tableAt && (
            <div style={fade(frame, tableAt, 12)}>
              <SummaryTable frame={frame} startFrame={tableAt} />
            </div>
          )}

          {/* Link */}
          {frame >= linkAt && (
            <div style={{ ...fade(frame, linkAt), marginTop: 10 }}>
              View results:{" "}
              <span style={{ color: cyan, textDecoration: "underline" }}>
                https://depvault.com/p/my-app
              </span>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
