import type { ReactElement } from "react";
import { cli, colors, fonts } from "./constants";

interface TerminalProps {
  children: React.ReactNode;
  width?: number;
  opacity?: number;
  scale?: number;
  title?: string;
  minHeight?: number;
}

export function Terminal(props: TerminalProps): ReactElement {
  const {
    children,
    width = 1050,
    opacity = 1,
    scale = 1,
    title = "Terminal — depvault",
    minHeight = 540,
  } = props;

  return (
    <div
      style={{
        width,
        backgroundColor: cli.termBg,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 40px ${colors.glowPrimary}`,
        opacity,
        transform: `scale(${scale})`,
        border: `1px solid ${colors.glassBorder}`,
      }}
    >
      {/* Title bar */}
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
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#28c840" }} />
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            color: cli.muted,
            fontSize: 13,
            fontFamily: fonts.mono,
          }}
        >
          {title}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: "22px 28px",
          fontFamily: fonts.mono,
          fontSize: 13.5,
          lineHeight: 1.75,
          color: cli.text,
          minHeight,
        }}
      >
        {children}
      </div>
    </div>
  );
}
