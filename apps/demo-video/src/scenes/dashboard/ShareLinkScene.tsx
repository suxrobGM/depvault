import type { ReactElement } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { alpha, BORDER_RADIUS, colors, fadeUp, fonts } from "../../components/constants";
import { Sidebar } from "../../components/Sidebar";

export function ShareLinkScene(): ReactElement {
  const frame = useCurrentFrame();

  const showSuccess = frame >= 70;
  const dialogOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dialogScale = interpolate(frame, [0, 12], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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

      {/* Dimmed background content */}
      <div style={{ position: "absolute", left: 240, top: 0, right: 0, bottom: 0, opacity: 0.3 }}>
        <div style={{ padding: "36px 44px", fontFamily: fonts.body }}>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>
            Projects / MyApp Frontend / Vault / Variables
          </div>
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
        </div>
      </div>

      {/* Overlay */}
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
        {/* Dialog */}
        <div
          style={{
            width: 480,
            backgroundColor: colors.glassBg,
            border: `1px solid ${colors.glassBorder}`,
            borderRadius: BORDER_RADIUS,
            backdropFilter: "blur(12px)",
            transform: `scale(${dialogScale})`,
            fontFamily: fonts.body,
          }}
        >
          {/* Title */}
          <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.textPrimary}
              strokeWidth={2}
            >
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            <span style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
              Share Secret
            </span>
          </div>

          <div style={{ padding: "16px 24px 24px" }}>
            {!showSuccess ? (
              <>
                {/* Variables info box */}
                <div
                  style={{
                    ...fadeUp(frame, 8),
                    padding: 12,
                    border: `1px solid ${colors.divider}`,
                    borderRadius: BORDER_RADIUS,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                    Sharing 3 variables
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    DATABASE_URL, JWT_SECRET, API_KEY
                  </div>
                </div>

                {/* Expiry select */}
                <div style={{ ...fadeUp(frame, 14), marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>
                    Link expires after
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: BORDER_RADIUS,
                      border: `1px solid ${colors.divider}`,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      fontSize: 13,
                      color: colors.textPrimary,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>24 hours</span>
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.textSecondary}
                      strokeWidth={2}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Password checkbox */}
                <div
                  style={{
                    ...fadeUp(frame, 20),
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: alpha(colors.primary, 0.15),
                      border: `1px solid ${alpha(colors.primary, 0.4)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width={12}
                      height={12}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth={3}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, color: colors.textPrimary }}>
                    Password protect this link
                  </span>
                </div>

                {/* Password field */}
                <div style={{ ...fadeUp(frame, 26), marginBottom: 16 }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: BORDER_RADIUS,
                      border: `1px solid ${colors.divider}`,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      fontSize: 13,
                      color: colors.textSecondary,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.textSecondary}
                      strokeWidth={2}
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    {"•".repeat(12)}
                  </div>
                </div>

                {/* Info alert */}
                <div
                  style={{
                    ...fadeUp(frame, 32),
                    padding: "10px 14px",
                    borderRadius: BORDER_RADIUS,
                    backgroundColor: alpha(colors.info, 0.1),
                    border: `1px solid ${alpha(colors.info, 0.2)}`,
                    fontSize: 12,
                    color: colors.info,
                    marginBottom: 20,
                  }}
                >
                  The recipient sees the value once. The link self-destructs after access.
                </div>

                {/* Buttons */}
                <div
                  style={{
                    ...fadeUp(frame, 38),
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 16px",
                      borderRadius: BORDER_RADIUS,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.textSecondary,
                    }}
                  >
                    Cancel
                  </div>
                  <div
                    style={{
                      padding: "8px 20px",
                      borderRadius: BORDER_RADIUS,
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.primary,
                      backgroundColor: alpha(colors.primary, 0.15),
                      border: `1px solid ${alpha(colors.primary, 0.25)}`,
                    }}
                  >
                    Generate Link
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Success state */}
                <div
                  style={{
                    ...fadeUp(frame, 72),
                    padding: "10px 14px",
                    borderRadius: BORDER_RADIUS,
                    backgroundColor: alpha(colors.success, 0.1),
                    border: `1px solid ${alpha(colors.success, 0.2)}`,
                    fontSize: 13,
                    color: colors.success,
                    marginBottom: 12,
                  }}
                >
                  Link created! Share it with the recipient. This link can only be accessed once.
                </div>

                <div
                  style={{
                    ...fadeUp(frame, 78),
                    padding: "10px 14px",
                    borderRadius: BORDER_RADIUS,
                    backgroundColor: alpha(colors.warning, 0.1),
                    border: `1px solid ${alpha(colors.warning, 0.2)}`,
                    fontSize: 12,
                    color: colors.warning,
                    marginBottom: 16,
                  }}
                >
                  The content will be permanently destroyed after first access.
                </div>

                {/* URL box */}
                <div
                  style={{
                    ...fadeUp(frame, 84),
                    padding: 12,
                    border: `1px solid ${colors.divider}`,
                    borderRadius: BORDER_RADIUS,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    fontFamily: fonts.mono,
                    fontSize: 12,
                    color: colors.textPrimary,
                    wordBreak: "break-all",
                    marginBottom: 16,
                  }}
                >
                  https://depvault.com/s/abc123def456ghi789
                </div>

                {/* Copy button */}
                <div
                  style={{
                    ...fadeUp(frame, 90),
                    padding: "10px 0",
                    borderRadius: BORDER_RADIUS,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.primary,
                    backgroundColor: alpha(colors.primary, 0.15),
                    border: `1px solid ${alpha(colors.primary, 0.25)}`,
                    textAlign: "center",
                  }}
                >
                  Copy Link
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
