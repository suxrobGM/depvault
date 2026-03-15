import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fadeUp, fonts } from "../../components/constants";
import { GlassCard } from "../../components/GlassCard";
import { Sidebar } from "../../components/Sidebar";

const deps = [
  {
    name: "react",
    installed: "18.3.1",
    latest: "19.0.0",
    status: "MAJOR",
    statusColor: colors.error,
    license: "MIT",
    vulns: 0,
  },
  {
    name: "next",
    installed: "14.2.5",
    latest: "15.1.0",
    status: "MAJOR",
    statusColor: colors.error,
    license: "MIT",
    vulns: 1,
  },
  {
    name: "typescript",
    installed: "5.4.5",
    latest: "5.6.2",
    status: "MINOR",
    statusColor: colors.warning,
    license: "Apache",
    vulns: 0,
  },
  {
    name: "@prisma/client",
    installed: "5.14.0",
    latest: "6.1.0",
    status: "MAJOR",
    statusColor: colors.error,
    license: "Apache",
    vulns: 2,
  },
  {
    name: "lodash",
    installed: "4.17.21",
    latest: "4.17.21",
    status: "UP TO DATE",
    statusColor: colors.success,
    license: "MIT",
    vulns: 0,
  },
  {
    name: "axios",
    installed: "1.7.2",
    latest: "1.7.4",
    status: "PATCH",
    statusColor: colors.success,
    license: "MIT",
    vulns: 0,
  },
  {
    name: "express",
    installed: "4.19.2",
    latest: "5.0.0",
    status: "MAJOR",
    statusColor: colors.error,
    license: "MIT",
    vulns: 0,
  },
  {
    name: "zod",
    installed: "3.23.8",
    latest: "3.23.8",
    status: "UP TO DATE",
    statusColor: colors.success,
    license: "MIT",
    vulns: 0,
  },
];

interface BreadcrumbProps {
  items: string[];
  frame: number;
}

function Breadcrumb(props: BreadcrumbProps): ReactElement {
  const { items, frame } = props;

  return (
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
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && (
            <span style={{ color: colors.textSecondary, opacity: 0.5, marginRight: 8 }}>/</span>
          )}
          <span
            style={{ color: i === items.length - 1 ? colors.textPrimary : colors.textSecondary }}
          >
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AnalysisScene(): ReactElement {
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
        <Breadcrumb items={["Projects", "MyApp Frontend", "Analysis"]} frame={frame} />
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
          Dependency Analysis
        </div>

        {/* Health badges */}
        <div style={{ ...fadeUp(frame, 8), display: "flex", gap: 12, marginBottom: 20 }}>
          <GlassCard
            style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontSize: 13, color: colors.textSecondary, fontFamily: fonts.body }}>
              Health Score
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: colors.primary,
                fontFamily: fonts.display,
              }}
            >
              92%
            </span>
          </GlassCard>
          <GlassCard
            style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontSize: 13, color: colors.textSecondary, fontFamily: fonts.body }}>
              Vulnerabilities
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: colors.error,
                fontFamily: fonts.display,
              }}
            >
              3
            </span>
          </GlassCard>
        </div>

        {/* Table */}
        <GlassCard style={{ padding: 0, overflow: "hidden", ...fadeUp(frame, 14) }}>
          {/* Header */}
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
            }}
          >
            <span style={{ flex: 2 }}>Package</span>
            <span style={{ width: 100, textAlign: "center" }}>Installed</span>
            <span style={{ width: 100, textAlign: "center" }}>Latest</span>
            <span style={{ width: 120, textAlign: "center" }}>Status</span>
            <span style={{ width: 80, textAlign: "center" }}>License</span>
            <span style={{ width: 60, textAlign: "center" }}>Vulns</span>
          </div>
          {/* Rows */}
          {deps.map((d, i) => {
            const rowDelay = 18 + i * 4;
            if (frame < rowDelay) return null;
            const opacity = interpolate(frame, [rowDelay, rowDelay + 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  fontSize: 13,
                  opacity,
                  fontFamily: fonts.body,
                }}
              >
                <span style={{ flex: 2, color: colors.textPrimary, fontWeight: 500 }}>
                  {d.name}
                </span>
                <span
                  style={{
                    width: 100,
                    textAlign: "center",
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {d.installed}
                </span>
                <span
                  style={{
                    width: 100,
                    textAlign: "center",
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: d.installed !== d.latest ? colors.primary : colors.textSecondary,
                  }}
                >
                  {d.latest}
                </span>
                <span style={{ width: 120, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      color: d.statusColor,
                      backgroundColor: d.statusColor + "18",
                    }}
                  >
                    {d.status}
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
                  {d.license}
                </span>
                <span style={{ width: 60, textAlign: "center" }}>
                  {d.vulns > 0 ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        color: colors.error,
                        backgroundColor: "rgba(248,113,113,0.15)",
                      }}
                    >
                      {d.vulns}
                    </span>
                  ) : (
                    <span style={{ color: colors.textSecondary, fontSize: 12 }}>—</span>
                  )}
                </span>
              </div>
            );
          })}
        </GlassCard>
      </div>
    </AbsoluteFill>
  );
}
