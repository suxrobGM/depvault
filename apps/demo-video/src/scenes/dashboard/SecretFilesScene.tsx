import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { alpha, colors, fadeUp, fonts } from "../../components/constants";
import { GlassCard } from "../../components/GlassCard";
import { Sidebar } from "../../components/Sidebar";

const secretFiles = [
  {
    name: "firebase-config.json",
    group: "Root",
    env: "Development",
    size: "2.4 KB",
    date: "Mar 10, 2026",
    icon: "code",
  },
  {
    name: "ssl-certificate.pem",
    group: "Root",
    env: "Production",
    size: "4.1 KB",
    date: "Mar 8, 2026",
    icon: "lock",
  },
  {
    name: "gcp-service-account.json",
    group: "API Server",
    env: "Staging",
    size: "1.8 KB",
    date: "Mar 5, 2026",
    icon: "code",
  },
];

interface FileIconProps {
  type: string;
}

function FileIcon(props: FileIconProps): ReactElement {
  const { type } = props;
  const color = type === "lock" ? colors.warning : colors.info;

  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.2)}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {type === "lock" ? (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ) : (
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )}
    </div>
  );
}

export function SecretFilesScene(): ReactElement {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(16,185,129,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(245,158,11,0.1) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 50% 80%, rgba(34,211,238,0.08) 0%, transparent 70%)
          `,
        }}
      />

      <Sidebar active="projects" />

      <div
        style={{
          position: "absolute",
          left: 240,
          top: 0,
          right: 0,
          bottom: 0,
          padding: "36px 44px",
          overflow: "hidden",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            ...fadeUp(frame, 0),
            display: "flex",
            gap: 8,
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 6,
            fontFamily: fonts.body,
          }}
        >
          <span>Projects</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>MyApp Frontend</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>Vault</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: colors.textPrimary }}>Secret Files</span>
        </div>

        <div
          style={{
            ...fadeUp(frame, 0),
            fontSize: 24,
            fontWeight: 700,
            fontFamily: fonts.display,
            color: colors.textPrimary,
            marginBottom: 20,
          }}
        >
          Environment Vault
        </div>

        {/* Tabs: Variables | Secret Files */}
        <div
          style={{
            ...fadeUp(frame, 4),
            display: "flex",
            gap: 0,
            marginBottom: 20,
            fontFamily: fonts.body,
            borderBottom: `1px solid ${colors.glassBorder}`,
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              fontSize: 14,
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            Variables
          </div>
          <div
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: colors.primary,
              borderBottom: `2px solid ${colors.primary}`,
              marginBottom: -1,
            }}
          >
            Secret Files
          </div>
        </div>

        {/* Upload button */}
        <div style={{ ...fadeUp(frame, 8), marginBottom: 16, fontFamily: fonts.body }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: colors.primary,
              backgroundColor: alpha(colors.primary, 0.15),
              border: `1px solid ${alpha(colors.primary, 0.25)}`,
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload File
          </div>
        </div>

        {/* Secret files table */}
        <GlassCard style={{ padding: 0, overflow: "hidden", ...fadeUp(frame, 12) }}>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              backgroundColor: "rgba(16,185,129,0.06)",
              borderBottom: `1px solid ${colors.glassBorder}`,
              fontSize: 12,
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontFamily: fonts.body,
              alignItems: "center",
            }}
          >
            <span style={{ width: 44 }} />
            <span style={{ flex: 2 }}>File</span>
            <span style={{ width: 120, textAlign: "center" }}>Vault Group</span>
            <span style={{ width: 120, textAlign: "center" }}>Environment</span>
            <span style={{ width: 80, textAlign: "center" }}>Size</span>
            <span style={{ width: 120, textAlign: "center" }}>Uploaded</span>
          </div>
          {secretFiles.map((f, i) => {
            const rowDelay = 16 + i * 5;
            if (frame < rowDelay) return null;
            const opacity = interpolate(frame, [rowDelay, rowDelay + 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  fontSize: 13,
                  opacity,
                  fontFamily: fonts.body,
                }}
              >
                <span style={{ width: 44 }}>
                  <FileIcon type={f.icon} />
                </span>
                <span
                  style={{
                    flex: 2,
                    color: colors.textPrimary,
                    fontWeight: 500,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                  }}
                >
                  {f.name}
                </span>
                <span
                  style={{
                    width: 120,
                    textAlign: "center",
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {f.group}
                </span>
                <span style={{ width: 120, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      color: colors.info,
                      backgroundColor: alpha(colors.info, 0.12),
                    }}
                  >
                    {f.env}
                  </span>
                </span>
                <span
                  style={{
                    width: 80,
                    textAlign: "center",
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {f.size}
                </span>
                <span
                  style={{
                    width: 120,
                    textAlign: "center",
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {f.date}
                </span>
              </div>
            );
          })}
        </GlassCard>
      </div>
    </AbsoluteFill>
  );
}
