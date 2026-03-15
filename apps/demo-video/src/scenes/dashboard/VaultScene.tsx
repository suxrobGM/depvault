import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { alpha, colors, fadeUp, fonts } from "../../components/constants";
import { GlassCard } from "../../components/GlassCard";
import { Sidebar } from "../../components/Sidebar";

const envVars = [
  { key: "DATABASE_URL", required: true, age: "2d", ageColor: colors.success },
  { key: "JWT_SECRET", required: true, age: "5d", ageColor: colors.success },
  { key: "SMTP_HOST", required: false, age: "12d", ageColor: colors.success },
  { key: "API_KEY", required: true, age: "45d", ageColor: colors.warning },
  { key: "REDIS_URL", required: false, age: "3d", ageColor: colors.success },
  { key: "S3_BUCKET", required: true, age: "8d", ageColor: colors.success },
  { key: "STRIPE_SECRET", required: true, age: "92d", ageColor: colors.error },
];

export function VaultScene(): ReactElement {
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
          <span style={{ color: colors.textPrimary }}>Variables</span>
        </div>

        {/* Title row with vault group */}
        <div
          style={{
            ...fadeUp(frame, 0),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: fonts.display,
              color: colors.textPrimary,
            }}
          >
            Environment Vault
          </div>
          {/* Vault group chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: alpha(colors.primary, 0.12),
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
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: colors.primary,
                fontFamily: fonts.body,
              }}
            >
              Root
            </span>
          </div>
        </div>

        {/* Environment tabs */}
        <div
          style={{
            ...fadeUp(frame, 6),
            display: "flex",
            gap: 4,
            marginBottom: 16,
            fontFamily: fonts.body,
          }}
        >
          {["Development", "Staging", "Production"].map((env, i) => (
            <div
              key={env}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? colors.textPrimary : colors.textSecondary,
                backgroundColor: i === 0 ? alpha(colors.primary, 0.12) : "transparent",
                border: `1px solid ${i === 0 ? alpha(colors.primary, 0.3) : colors.glassBorder}`,
              }}
            >
              {env}
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div
          style={{
            ...fadeUp(frame, 9),
            display: "flex",
            gap: 10,
            marginBottom: 16,
            fontFamily: fonts.body,
          }}
        >
          <div
            style={{
              padding: "7px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: colors.primary,
              backgroundColor: alpha(colors.primary, 0.15),
              border: `1px solid ${alpha(colors.primary, 0.25)}`,
            }}
          >
            + New Variable
          </div>
          <div
            style={{
              padding: "7px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: colors.textSecondary,
              border: `1px solid ${colors.divider}`,
            }}
          >
            Import
          </div>
        </div>

        {/* Vault table */}
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
            }}
          >
            <span style={{ flex: 2 }}>Key</span>
            <span style={{ flex: 2 }}>Value</span>
            <span style={{ width: 80, textAlign: "center" }}>Required</span>
            <span style={{ width: 80, textAlign: "center" }}>Age</span>
          </div>
          {envVars.map((v, i) => {
            const rowDelay = 16 + i * 4;
            if (frame < rowDelay) return null;
            const opacity = interpolate(frame, [rowDelay, rowDelay + 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={v.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  fontSize: 13,
                  opacity,
                }}
              >
                <span
                  style={{
                    flex: 2,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: colors.textPrimary,
                    fontWeight: 500,
                  }}
                >
                  {v.key}
                </span>
                <span
                  style={{
                    flex: 2,
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                >
                  {"•".repeat(16)}
                </span>
                <span style={{ width: 80, textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: v.required ? colors.primary : "rgba(255,255,255,0.15)",
                    }}
                  />
                </span>
                <span style={{ width: 80, textAlign: "center", fontSize: 12, color: v.ageColor }}>
                  {v.age}
                </span>
              </div>
            );
          })}
        </GlassCard>
      </div>
    </AbsoluteFill>
  );
}
