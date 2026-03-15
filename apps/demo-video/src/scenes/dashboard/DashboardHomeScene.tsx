import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, fadeUp, fonts } from "../../components/constants";
import { GlassCard } from "../../components/GlassCard";
import { Sidebar } from "../../components/Sidebar";

const stats = [
  { value: "5", label: "Projects", color: colors.info },
  { value: "12", label: "Members", color: colors.purple },
  { value: "47", label: "Dependencies", color: colors.secondary },
  { value: "92%", label: "Health Score", color: colors.primary },
];

const projects = [
  {
    name: "MyApp Frontend",
    desc: "React/TypeScript web application with Next.js",
    date: "Mar 12, 2026",
  },
  { name: "API Server", desc: "Go gRPC microservice for payment processing", date: "Mar 10, 2026" },
  {
    name: "Mobile App",
    desc: "React Native cross-platform mobile application",
    date: "Mar 8, 2026",
  },
];

export function DashboardHomeScene(): ReactElement {
  const frame = useCurrentFrame();

  const sidebarX = interpolate(frame, [0, 18], [-240, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Gradient mesh background */}
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

      <Sidebar translateX={sidebarX} active="dashboard" />

      {/* Content area */}
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
        {/* Greeting */}
        <div style={fadeUp(frame, 5)}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              fontFamily: fonts.display,
              background: `linear-gradient(135deg, ${colors.info}, ${colors.primary}, #3b82f6)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 4,
            }}
          >
            Welcome back, Alex
          </div>
          <div style={{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body }}>
            Saturday, March 15
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 28,
            ...fadeUp(frame, 20),
            fontFamily: fonts.body,
          }}
        >
          {stats.map((s, i) => (
            <GlassCard key={s.label} style={{ flex: 1, ...fadeUp(frame, 25 + i * 8) }}>
              <div
                style={{ fontSize: 34, fontWeight: 700, color: s.color, fontFamily: fonts.display }}
              >
                {s.value}
              </div>
              <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                {s.label}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Recent Projects */}
        <div style={{ marginTop: 32, ...fadeUp(frame, 55), fontFamily: fonts.body }}>
          <div
            style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, marginBottom: 16 }}
          >
            Recent Projects
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {projects.map((p, i) => (
              <GlassCard
                key={p.name}
                style={{
                  flex: 1,
                  ...fadeUp(frame, 62 + i * 8),
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginBottom: 6,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                  {p.desc}
                </div>
                <div style={{ fontSize: 11, color: colors.textSecondary }}>{p.date}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
