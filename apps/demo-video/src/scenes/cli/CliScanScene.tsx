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

const B = {
  tl: "╭",
  tr: "╮",
  bl: "╰",
  br: "╯",
  h: "─",
  v: "│",
  tee: "┬",
  btee: "┴",
  ltee: "├",
  rtee: "┤",
  cross: "┼",
};

interface RoundedTableProps {
  title?: string;
  headers: string[];
  rows: Array<{ cells: string[]; colors?: string[] }>;
  widths: number[];
  frame: number;
  startFrame: number;
}

function RoundedTable(props: RoundedTableProps): ReactElement {
  const { title, headers, rows, widths, frame, startFrame } = props;

  const topBorder = B.tl + widths.map((w) => B.h.repeat(w + 2)).join(B.tee) + B.tr;
  const midBorder = B.ltee + widths.map((w) => B.h.repeat(w + 2)).join(B.cross) + B.rtee;
  const bottomBorder = B.bl + widths.map((w) => B.h.repeat(w + 2)).join(B.btee) + B.br;

  const padCell = (text: string, width: number) => {
    const pad = width - text.length;
    return " " + text + " ".repeat(Math.max(0, pad) + 1);
  };

  return (
    <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6, fontFamily: fonts.mono }}>
      {title && <div style={{ color: cli.cyan, fontWeight: 600, marginBottom: 4 }}>{title}</div>}
      <span style={{ color: cli.grey }}>{topBorder}</span>
      {"\n"}
      <span style={{ color: cli.grey }}>{B.v}</span>
      {headers.map((h, i) => (
        <span key={h}>
          <span style={{ color: cli.cyan }}>{padCell(h, widths[i])}</span>
          <span style={{ color: cli.grey }}>{B.v}</span>
        </span>
      ))}
      {"\n"}
      <span style={{ color: cli.grey }}>{midBorder}</span>
      {rows.map((row, ri) => {
        const rowFrame = startFrame + 5 + ri * 4;
        if (frame < rowFrame) return null;
        const opacity = interpolate(frame, [rowFrame, rowFrame + 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span key={ri} style={{ opacity }}>
            {"\n"}
            <span style={{ color: cli.grey }}>{B.v}</span>
            {row.cells.map((cell, ci) => (
              <span key={ci}>
                <span style={{ color: row.colors?.[ci] || cli.text }}>
                  {padCell(cell, widths[ci])}
                </span>
                <span style={{ color: cli.grey }}>{B.v}</span>
              </span>
            ))}
          </span>
        );
      })}
      {"\n"}
      <span style={{ color: cli.grey }}>{bottomBorder}</span>
    </pre>
  );
}

interface ProgressLineProps {
  frame: number;
  startFrame: number;
  label: string;
  score: number;
  scoreColor: string;
}

function ProgressLine(props: ProgressLineProps): ReactElement | null {
  const { frame, startFrame, label, score, scoreColor } = props;

  if (frame < startFrame) return null;
  const progress = interpolate(frame, [startFrame, startFrame + 25], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const done = progress >= 100;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 26 }}>
      <span style={{ width: 16, textAlign: "center" }}>
        {done ? (
          <span style={{ color: colors.success }}>✔</span>
        ) : (
          <Spinner frame={frame} color={cli.cyan} />
        )}
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
            backgroundColor: colors.primary,
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
}

const summaryRows = [
  { cells: ["Dependencies analyzed", "47"], colors: [colors.textSecondary, cli.text] },
  { cells: ["Files analyzed", "3"], colors: [colors.textSecondary, cli.text] },
  { cells: ["Vulnerabilities found", "2"], colors: [colors.textSecondary, "#f7768e"] },
  { cells: ["Env variables pushed", "12"], colors: [colors.textSecondary, "#9ece6a"] },
  { cells: ["Secret leaks detected", "0"], colors: [colors.textSecondary, "#9ece6a"] },
  { cells: ["Secret files uploaded", "1"], colors: [colors.textSecondary, cli.text] },
];

export function CliScanScene(): ReactElement {
  const frame = useCurrentFrame();

  const terminalOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const terminalScale = interpolate(frame, [0, 15], [0.96, 1], { extrapolateRight: "clamp" });

  const command = "depvault scan";
  const { charsVisible, done: typingDone } = useTypingAnimation(frame, 20, command);

  const bannerAt = 50;
  const scanAt = 80;
  const ruleAt = 95;
  const foundAt = 105;
  const treeAt = 112;
  const progressAt = 135;
  const tableAt = 205;
  const linkAt = 275;

  return (
    <AbsoluteFill
      style={{ backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}
    >
      <Terminal opacity={terminalOpacity} scale={terminalScale}>
        {/* Command prompt */}
        <div>
          <span style={{ color: colors.primary }}>~/my-app</span>
          <span style={{ color: cli.muted }}> $ </span>
          <span style={{ color: colors.textPrimary }}>{command.slice(0, charsVisible)}</span>
          <BlinkingCursor frame={frame} visible={!typingDone || frame < bannerAt} />
        </div>

        {/* FigletText banner */}
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

        {/* Scanning */}
        {frame >= scanAt && (
          <div style={fade(frame, scanAt)}>
            <span style={{ color: cli.cyan }}>Scanning:</span> ~/my-app
          </div>
        )}

        {/* Rule divider — cyan1, left-justified, thin ─ chars */}
        {frame >= ruleAt && (
          <div style={{ ...fade(frame, ruleAt), color: cli.cyan, margin: "14px 0 6px" }}>
            ── Dependency Analysis ─────────────────────────────
          </div>
        )}

        {/* Found files */}
        {frame >= foundAt && (
          <div style={fade(frame, foundAt)}>
            Found <span style={{ color: colors.primary }}>3</span> dependency file(s)
          </div>
        )}

        {/* File tree */}
        {frame >= treeAt && (
          <div style={fade(frame, treeAt, 12)}>
            <div style={{ color: cli.muted }}>
              ├── <span style={{ color: cli.cyan }}>package.json</span>
            </div>
            <div style={{ color: cli.muted }}>
              ├── <span style={{ color: cli.cyan }}>requirements.txt</span>
            </div>
            <div style={{ color: cli.muted }}>
              └── <span style={{ color: cli.cyan }}>go.mod</span>
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
              scoreColor={colors.primary}
            />
            <ProgressLine
              frame={frame}
              startFrame={progressAt + 12}
              label="requirements.txt"
              score={78}
              scoreColor={cli.yellow}
            />
            <ProgressLine
              frame={frame}
              startFrame={progressAt + 24}
              label="go.mod"
              score={85}
              scoreColor={colors.primary}
            />
          </div>
        )}

        {/* Summary table — rounded borders */}
        {frame >= tableAt && (
          <div style={fade(frame, tableAt, 12)}>
            <RoundedTable
              title="Scan Complete"
              headers={["Metric", "Result"]}
              rows={summaryRows}
              widths={[24, 8]}
              frame={frame}
              startFrame={tableAt}
            />
          </div>
        )}

        {/* Link */}
        {frame >= linkAt && (
          <div style={{ ...fade(frame, linkAt), marginTop: 10 }}>
            View results:{" "}
            <span style={{ color: cli.cyan, textDecoration: "underline" }}>
              https://depvault.com/p/my-app
            </span>
          </div>
        )}
      </Terminal>
    </AbsoluteFill>
  );
}
