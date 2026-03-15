import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cli, colors, fonts } from "../../components/constants";

const YAML_LINES = [
  { text: "# .github/workflows/deploy.yml", type: "comment" },
  { text: "", type: "blank" },
  { text: "# Add DEPVAULT_TOKEN to your repository secrets", type: "comment" },
  { text: "- name: Setup DepVault CLI", type: "key-value" },
  { text: "  uses: suxrobGM/depvault@v1", type: "key-value" },
  { text: "  with:", type: "key" },
  { text: "    token: ${{ secrets.DEPVAULT_TOKEN }}", type: "key-expr" },
  { text: "", type: "blank" },
  { text: "- name: Pull secrets", type: "key-value" },
  { text: "  run: |", type: "key" },
  { text: "    depvault ci pull --format env --output .env", type: "string" },
  { text: "    cat .env >> $GITHUB_ENV", type: "string" },
];

function syntaxColor(type: string, text: string): ReactElement {
  switch (type) {
    case "comment":
      return <span style={{ color: cli.grey }}>{text}</span>;
    case "key":
      return <span style={{ color: cli.cyan }}>{text}</span>;
    case "key-value": {
      const colonIdx = text.indexOf(":");
      if (colonIdx === -1) return <span style={{ color: cli.text }}>{text}</span>;
      return (
        <>
          <span style={{ color: cli.cyan }}>{text.slice(0, colonIdx + 1)}</span>
          <span style={{ color: colors.success }}>{text.slice(colonIdx + 1)}</span>
        </>
      );
    }
    case "key-expr": {
      const colonIdx = text.indexOf(":");
      const before = text.slice(0, colonIdx + 1);
      const after = text.slice(colonIdx + 1);
      const parts = after.split(/(\$\{\{[^}]*\}\})/);
      return (
        <>
          <span style={{ color: cli.cyan }}>{before}</span>
          {parts.map((p, i) =>
            p.startsWith("${{") ? (
              <span key={i} style={{ color: cli.yellow }}>
                {p}
              </span>
            ) : (
              <span key={i} style={{ color: colors.success }}>
                {p}
              </span>
            ),
          )}
        </>
      );
    }
    case "string":
      return <span style={{ color: colors.success }}>{text}</span>;
    default:
      return <span style={{ color: cli.text }}>{text}</span>;
  }
}

export function CliCiScene(): ReactElement {
  const frame = useCurrentFrame();

  const windowOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const windowScale = interpolate(frame, [0, 15], [0.96, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{ backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}
    >
      <div
        style={{
          width: 900,
          backgroundColor: cli.termBg,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 40px ${colors.glowPrimary}`,
          opacity: windowOpacity,
          transform: `scale(${windowScale})`,
          border: `1px solid ${colors.glassBorder}`,
        }}
      >
        {/* Title bar — code editor style */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px 16px",
            backgroundColor: cli.termTitleBg,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }}
            />
            <div
              style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }}
            />
            <div
              style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }}
            />
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              color: colors.textSecondary,
              fontSize: 13,
              fontFamily: fonts.mono,
            }}
          >
            .github/workflows/deploy.yml
          </div>
        </div>

        {/* YAML content */}
        <div
          style={{
            padding: "22px 28px",
            fontFamily: fonts.mono,
            fontSize: 14,
            lineHeight: 1.8,
            color: cli.text,
            minHeight: 360,
          }}
        >
          {YAML_LINES.map((line, i) => {
            const lineDelay = 20 + i * 8;
            if (frame < lineDelay) return null;
            const lineOpacity = interpolate(frame, [lineDelay, lineDelay + 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{ opacity: lineOpacity, minHeight: line.type === "blank" ? 20 : undefined }}
              >
                {line.text && (
                  <>
                    <span style={{ color: cli.grey, userSelect: "none", marginRight: 16 }}>
                      {String(i + 1).padStart(2, " ")}
                    </span>
                    {syntaxColor(line.type, line.text)}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
