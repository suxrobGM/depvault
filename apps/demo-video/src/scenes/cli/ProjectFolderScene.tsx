import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cli, colors, fade, fonts } from "../../components/constants";
import { Terminal } from "../../components/Terminal";

interface TreeNode {
  label: string;
  indent: number;
  connector: string;
  color: string;
  highlight?: boolean;
  icon?: string;
}

const treeLines: TreeNode[] = [
  { label: "my-app/", indent: 0, connector: "", color: cli.cyan, icon: "📁" },
  {
    label: ".env",
    indent: 1,
    connector: "├──",
    color: colors.success,
    highlight: true,
    icon: "🔒",
  },
  { label: ".secrets/", indent: 1, connector: "├──", color: cli.yellow, icon: "📁" },
  {
    label: "ssl-certificate.pem",
    indent: 2,
    connector: "│   └──",
    color: colors.success,
    highlight: true,
    icon: "🔑",
  },
  { label: "api/", indent: 1, connector: "├──", color: cli.cyan, icon: "📁" },
  {
    label: ".env",
    indent: 2,
    connector: "│   ├──",
    color: colors.success,
    highlight: true,
    icon: "🔒",
  },
  { label: ".secrets/", indent: 2, connector: "│   └──", color: cli.yellow, icon: "📁" },
  {
    label: "gcp-service-account.json",
    indent: 3,
    connector: "│       └──",
    color: colors.success,
    highlight: true,
    icon: "🔑",
  },
  { label: "src/", indent: 1, connector: "├──", color: cli.text, icon: "📁" },
  { label: "package.json", indent: 1, connector: "├──", color: cli.text, icon: "📄" },
  { label: "tsconfig.json", indent: 1, connector: "└──", color: cli.text, icon: "📄" },
];

export function ProjectFolderScene(): ReactElement {
  const frame = useCurrentFrame();

  const terminalOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const terminalScale = interpolate(frame, [0, 15], [0.96, 1], { extrapolateRight: "clamp" });

  const headerAt = 10;
  const treeStartAt = 30;
  const noteAt = treeStartAt + treeLines.length * 6 + 10;

  return (
    <AbsoluteFill
      style={{ backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}
    >
      <Terminal opacity={terminalOpacity} scale={terminalScale} minHeight={460}>
        {/* Header */}
        {frame >= headerAt && (
          <div style={fade(frame, headerAt)}>
            <div style={{ color: cli.cyan, fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
              ── Project Structure After Pull ──────────────────────
            </div>
            <div style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 14 }}>
              <span style={{ color: colors.success }}>✔</span> Env files and secret files pulled to
              vault group directories
            </div>
          </div>
        )}

        {/* Tree */}
        {frame >= treeStartAt && (
          <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.7, fontFamily: fonts.mono }}>
            {treeLines.map((node, i) => {
              const lineFrame = treeStartAt + i * 6;
              if (frame < lineFrame) return null;
              const opacity = interpolate(frame, [lineFrame, lineFrame + 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity,
                    backgroundColor: node.highlight ? "rgba(16, 185, 129, 0.06)" : "transparent",
                    borderRadius: 3,
                    padding: "0 4px",
                  }}
                >
                  <span style={{ color: cli.grey }}>{node.connector}</span>
                  {node.connector && " "}
                  <span style={{ fontSize: 12 }}>{node.icon} </span>
                  <span style={{ color: node.color, fontWeight: node.highlight ? 600 : 400 }}>
                    {node.label}
                  </span>
                  {node.highlight && (
                    <span style={{ color: colors.primary, fontSize: 11, marginLeft: 8 }}>
                      ← encrypted
                    </span>
                  )}
                </div>
              );
            })}
          </pre>
        )}

        {/* Footer note */}
        {frame >= noteAt && (
          <div style={{ ...fade(frame, noteAt), marginTop: 14 }}>
            <div style={{ color: cli.grey, fontSize: 12 }}>
              <span style={{ color: colors.primary }}>depvault pull</span> writes .env files and
              secret files to each vault group&apos;s configured directory.
            </div>
            <div style={{ color: cli.grey, fontSize: 12, marginTop: 4 }}>
              <span style={{ color: colors.primary }}>depvault push env</span> reads .env files from
              these directories and encrypts them to the vault.
            </div>
          </div>
        )}
      </Terminal>
    </AbsoluteFill>
  );
}
