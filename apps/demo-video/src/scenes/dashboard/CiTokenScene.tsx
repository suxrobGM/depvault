import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { alpha, BORDER_RADIUS, colors, fadeUp, fonts } from "../../components/constants";
import { GlassCard } from "../../components/GlassCard";
import { Sidebar } from "../../components/Sidebar";

const tokens = [
  {
    name: "deploy-prod",
    prefix: "a3f8",
    env: "Production",
    expires: "Apr 15, 2026",
    lastUsed: "Mar 14, 2026",
    status: "Active",
    statusColor: colors.success,
  },
  {
    name: "staging-ci",
    prefix: "7b2c",
    env: "Staging",
    expires: "May 1, 2026",
    lastUsed: "Mar 12, 2026",
    status: "Active",
    statusColor: colors.success,
  },
  {
    name: "test-runner",
    prefix: "e91d",
    env: "Development",
    expires: "Feb 28, 2026",
    lastUsed: "Feb 15, 2026",
    status: "Expired",
    statusColor: colors.warning,
  },
];

const GITHUB_SNIPPET = `# Add DEPVAULT_TOKEN to your repository secrets
- name: Setup DepVault CLI
  uses: suxrobGM/depvault@v1
  with:
    token: \${{ secrets.DEPVAULT_TOKEN }}

- name: Pull secrets
  run: |
    depvault ci pull --format env --output .env
    cat .env >> $GITHUB_ENV`;

export function CiTokenScene(): ReactElement {
  const frame = useCurrentFrame();

  const showDialog = frame >= 80;
  const dialogOpacity = showDialog
    ? interpolate(frame, [80, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const dialogScale = showDialog
    ? interpolate(frame, [80, 92], [0.95, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0.95;

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
          opacity: showDialog ? 0.3 : 1,
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
          <span style={{ color: colors.textPrimary }}>Settings</span>
        </div>

        <div
          style={{
            ...fadeUp(frame, 0),
            fontSize: 24,
            fontWeight: 700,
            fontFamily: fonts.display,
            color: colors.textPrimary,
            marginBottom: 24,
          }}
        >
          Project Settings
        </div>

        {/* CI/CD Tokens card */}
        <GlassCard style={{ ...fadeUp(frame, 6), padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              fontFamily: fonts.body,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>
                CI/CD Tokens
              </div>
              <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                Generate scoped tokens for CI/CD pipelines to fetch secrets at build time.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: BORDER_RADIUS,
                fontSize: 13,
                fontWeight: 600,
                color: colors.textSecondary,
                border: `1px solid ${colors.divider}`,
              }}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Generate Token
            </div>
          </div>

          {/* Token table */}
          <div
            style={{
              borderRadius: 8,
              overflow: "hidden",
              border: `1px solid ${colors.glassBorder}`,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "8px 16px",
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
              <span style={{ flex: 1.5 }}>Name</span>
              <span style={{ flex: 1.5 }}>Token</span>
              <span style={{ width: 100, textAlign: "center" }}>Environment</span>
              <span style={{ width: 110, textAlign: "center" }}>Expires</span>
              <span style={{ width: 110, textAlign: "center" }}>Last Used</span>
              <span style={{ width: 80, textAlign: "center" }}>Status</span>
            </div>
            {tokens.map((t, i) => {
              const rowDelay = 14 + i * 5;
              if (frame < rowDelay) return null;
              const opacity = interpolate(frame, [rowDelay, rowDelay + 6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={t.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    fontSize: 13,
                    opacity,
                    fontFamily: fonts.body,
                  }}
                >
                  <span style={{ flex: 1.5, color: colors.textPrimary, fontWeight: 500 }}>
                    {t.name}
                  </span>
                  <span
                    style={{
                      flex: 1.5,
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    dvci_{t.prefix}...
                  </span>
                  <span
                    style={{
                      width: 100,
                      textAlign: "center",
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    {t.env}
                  </span>
                  <span
                    style={{
                      width: 110,
                      textAlign: "center",
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    {t.expires}
                  </span>
                  <span
                    style={{
                      width: 110,
                      textAlign: "center",
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    {t.lastUsed}
                  </span>
                  <span style={{ width: 80, textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        color: t.statusColor,
                        backgroundColor: alpha(t.statusColor, 0.12),
                      }}
                    >
                      {t.status}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Integration code dialog */}
      {showDialog && (
        <div
          style={{
            position: "absolute",
            left: 240,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: dialogOpacity,
          }}
        >
          <div
            style={{
              width: 520,
              backgroundColor: colors.glassBg,
              border: `1px solid ${colors.glassBorder}`,
              borderRadius: BORDER_RADIUS,
              backdropFilter: "blur(12px)",
              transform: `scale(${dialogScale})`,
              fontFamily: fonts.body,
            }}
          >
            <div
              style={{
                padding: "20px 24px 0",
                fontSize: 18,
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              Integration Code
            </div>
            <div style={{ padding: "16px 24px 24px" }}>
              {/* Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  marginBottom: 12,
                  borderBottom: `1px solid ${colors.glassBorder}`,
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.primary,
                    borderBottom: `2px solid ${colors.primary}`,
                    marginBottom: -1,
                  }}
                >
                  GitHub Actions
                </div>
                <div style={{ padding: "8px 16px", fontSize: 13, color: colors.textSecondary }}>
                  GitLab CI
                </div>
              </div>

              <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                Integration examples
              </div>

              {/* Code snippet */}
              <div
                style={{
                  ...fadeUp(frame, 90),
                  padding: 12,
                  borderRadius: BORDER_RADIUS,
                  border: `1px solid ${colors.divider}`,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: colors.success,
                  whiteSpace: "pre-wrap",
                }}
              >
                {GITHUB_SNIPPET}
              </div>

              {/* Close button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.textSecondary,
                  }}
                >
                  Close
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
