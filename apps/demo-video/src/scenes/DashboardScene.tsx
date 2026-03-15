import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const inter = "'Inter', 'Segoe UI', system-ui, sans-serif";
const syne = "'Syne', 'Inter', sans-serif";
const mono = "'JetBrains Mono', monospace";
const green = "#10b981";
const bg = "#0a0e17";
const paper = "#0f1420";
const glassBg = "rgba(22, 28, 46, 0.6)";
const glassBorder = "rgba(255, 255, 255, 0.08)";
const textPrimary = "#f1f5f9";
const textSecondary = "#94a3b8";
const muted = "#636a80";

const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: glassBg,
      border: `1px solid ${glassBorder}`,
      borderRadius: 10,
      padding: 20,
      ...style,
    }}
  >
    {children}
  </div>
);

const fadeUp = (frame: number, delay: number, dur = 12) => ({
  opacity: interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }),
  transform: `translateY(${interpolate(frame, [delay, delay + dur], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })}px)`,
});

/* ── Sidebar ─────────────────────────────────────────────── */

const navItems = [
  { id: "dashboard", label: "Dashboard", color: green },
  { id: "projects", label: "Projects", color: "#22d3ee" },
  { id: "activity", label: "Activity", color: "#f59e0b" },
  { id: "security", label: "Security", color: "#f87171" },
  { id: "converter", label: "Converter", color: "#a78bfa" },
  { id: "settings", label: "Settings", color: textSecondary },
];

const Sidebar: React.FC<{ translateX: number; active: string }> = ({ translateX, active }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 240,
      backgroundColor: paper,
      borderRight: `1px solid ${glassBorder}`,
      transform: `translateX(${translateX}px)`,
      display: "flex",
      flexDirection: "column",
      fontFamily: inter,
      zIndex: 10,
    }}
  >
    {/* Logo */}
    <div
      style={{
        padding: "24px 20px 20px",
        fontSize: 22,
        fontWeight: 800,
        fontFamily: syne,
        color: green,
        letterSpacing: -0.5,
      }}
    >
      DepVault
    </div>

    {/* Nav */}
    <div style={{ flex: 1, padding: "0 12px" }}>
      {navItems.map((item) => {
        const isActive = item.id === active;
        return (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 8,
              marginBottom: 2,
              backgroundColor: isActive ? "rgba(16,185,129,0.1)" : "transparent",
              borderLeft: isActive ? `3px solid ${green}` : "3px solid transparent",
              color: isActive ? textPrimary : textSecondary,
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: item.color,
                opacity: isActive ? 1 : 0.5,
              }}
            />
            {item.label}
          </div>
        );
      })}
    </div>

    {/* User */}
    <div
      style={{
        padding: "16px 20px",
        borderTop: `1px solid ${glassBorder}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${green}, #059669)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        A
      </div>
      <div>
        <div style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>Alex Johnson</div>
        <div style={{ color: textSecondary, fontSize: 11 }}>alex@company.com</div>
      </div>
    </div>
  </div>
);

/* ── Dashboard Content ───────────────────────────────────── */

const stats = [
  { value: "5", label: "Projects", color: "#22d3ee" },
  { value: "12", label: "Members", color: "#a78bfa" },
  { value: "47", label: "Dependencies", color: "#f59e0b" },
  { value: "92%", label: "Health Score", color: green },
];

const projects = [
  {
    name: "MyApp Frontend",
    desc: "React/TypeScript web application with Next.js",
    date: "Mar 12, 2026",
  },
  {
    name: "API Server",
    desc: "Go gRPC microservice for payment processing",
    date: "Mar 10, 2026",
  },
  {
    name: "Mobile App",
    desc: "React Native cross-platform mobile application",
    date: "Mar 8, 2026",
  },
];

const DashboardContent: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ fontFamily: inter }}>
    {/* Greeting */}
    <div style={fadeUp(frame, 5)}>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily: syne,
          background: `linear-gradient(135deg, #22d3ee, ${green}, #3b82f6)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}
      >
        Welcome back, Alex
      </div>
      <div style={{ color: textSecondary, fontSize: 14 }}>Wednesday, March 15</div>
    </div>

    {/* Stats */}
    <div style={{ display: "flex", gap: 16, marginTop: 28, ...fadeUp(frame, 20) }}>
      {stats.map((s, i) => (
        <GlassCard key={s.label} style={{ flex: 1, ...fadeUp(frame, 25 + i * 8) }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: s.color,
              fontFamily: syne,
            }}
          >
            {s.value}
          </div>
          <div style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>{s.label}</div>
        </GlassCard>
      ))}
    </div>

    {/* Recent Projects */}
    <div style={{ marginTop: 32, ...fadeUp(frame, 55) }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: textPrimary,
          marginBottom: 16,
        }}
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
                color: textPrimary,
                marginBottom: 6,
              }}
            >
              {p.name}
            </div>
            <div style={{ fontSize: 13, color: textSecondary, marginBottom: 12 }}>{p.desc}</div>
            <div style={{ fontSize: 11, color: textSecondary }}>{p.date}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  </div>
);

/* ── Analysis Content ────────────────────────────────────── */

const deps = [
  {
    name: "react",
    installed: "18.3.1",
    latest: "19.0.0",
    status: "MAJOR",
    statusColor: "#f87171",
    license: "MIT",
    vulns: 0,
  },
  {
    name: "next",
    installed: "14.2.5",
    latest: "15.1.0",
    status: "MAJOR",
    statusColor: "#f87171",
    license: "MIT",
    vulns: 1,
  },
  {
    name: "typescript",
    installed: "5.4.5",
    latest: "5.6.2",
    status: "MINOR",
    statusColor: "#fbbf24",
    license: "Apache",
    vulns: 0,
  },
  {
    name: "@prisma/client",
    installed: "5.14.0",
    latest: "6.1.0",
    status: "MAJOR",
    statusColor: "#f87171",
    license: "Apache",
    vulns: 2,
  },
  {
    name: "lodash",
    installed: "4.17.21",
    latest: "4.17.21",
    status: "UP TO DATE",
    statusColor: "#34d399",
    license: "MIT",
    vulns: 0,
  },
  {
    name: "axios",
    installed: "1.7.2",
    latest: "1.7.4",
    status: "PATCH",
    statusColor: "#34d399",
    license: "MIT",
    vulns: 0,
  },
  {
    name: "express",
    installed: "4.19.2",
    latest: "5.0.0",
    status: "MAJOR",
    statusColor: "#f87171",
    license: "MIT",
    vulns: 0,
  },
  {
    name: "zod",
    installed: "3.23.8",
    latest: "3.23.8",
    status: "UP TO DATE",
    statusColor: "#34d399",
    license: "MIT",
    vulns: 0,
  },
];

const AnalysisContent: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ fontFamily: inter }}>
    {/* Breadcrumb */}
    <div
      style={{
        ...fadeUp(frame, 0),
        display: "flex",
        gap: 8,
        fontSize: 13,
        color: textSecondary,
        marginBottom: 6,
      }}
    >
      <span>Projects</span>
      <span style={{ color: muted }}>{"/"}</span>
      <span>MyApp Frontend</span>
      <span style={{ color: muted }}>{"/"}</span>
      <span style={{ color: textPrimary }}>Analysis</span>
    </div>
    <div
      style={{
        ...fadeUp(frame, 0),
        fontSize: 24,
        fontWeight: 700,
        fontFamily: syne,
        color: textPrimary,
        marginBottom: 20,
      }}
    >
      Dependency Analysis
    </div>

    {/* Health badge */}
    <div style={{ ...fadeUp(frame, 8), display: "flex", gap: 12, marginBottom: 20 }}>
      <GlassCard style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: textSecondary }}>Health Score</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: green, fontFamily: syne }}>92%</span>
      </GlassCard>
      <GlassCard style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: textSecondary }}>Vulnerabilities</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#f87171", fontFamily: syne }}>3</span>
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
          borderBottom: `1px solid ${glassBorder}`,
          fontSize: 12,
          fontWeight: 600,
          color: textSecondary,
          textTransform: "uppercase" as const,
          letterSpacing: 0.5,
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
              borderBottom: `1px solid rgba(255,255,255,0.03)`,
              fontSize: 13,
              opacity,
            }}
          >
            <span style={{ flex: 2, color: textPrimary, fontWeight: 500 }}>{d.name}</span>
            <span
              style={{
                width: 100,
                textAlign: "center",
                fontFamily: mono,
                fontSize: 12,
                color: textSecondary,
              }}
            >
              {d.installed}
            </span>
            <span
              style={{
                width: 100,
                textAlign: "center",
                fontFamily: mono,
                fontSize: 12,
                color: d.installed !== d.latest ? green : textSecondary,
              }}
            >
              {d.latest}
            </span>
            <span style={{ width: 120, textAlign: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  color: d.statusColor,
                  backgroundColor: d.statusColor + "18",
                }}
              >
                {d.status}
              </span>
            </span>
            <span style={{ width: 80, textAlign: "center", fontSize: 12, color: textSecondary }}>
              {d.license}
            </span>
            <span style={{ width: 60, textAlign: "center" }}>
              {d.vulns > 0 ? (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#f87171",
                    backgroundColor: "rgba(248,113,113,0.15)",
                  }}
                >
                  {d.vulns}
                </span>
              ) : (
                <span style={{ color: textSecondary, fontSize: 12 }}>&mdash;</span>
              )}
            </span>
          </div>
        );
      })}
    </GlassCard>
  </div>
);

/* ── Vault Content ───────────────────────────────────────── */

const envVars = [
  { key: "DATABASE_URL", required: true, age: "2d", ageColor: "#34d399" },
  { key: "JWT_SECRET", required: true, age: "5d", ageColor: "#34d399" },
  { key: "SMTP_HOST", required: false, age: "12d", ageColor: "#34d399" },
  { key: "API_KEY", required: true, age: "45d", ageColor: "#fbbf24" },
  { key: "REDIS_URL", required: false, age: "3d", ageColor: "#34d399" },
  { key: "S3_BUCKET", required: true, age: "8d", ageColor: "#34d399" },
  { key: "STRIPE_SECRET", required: true, age: "92d", ageColor: "#f87171" },
];

const VaultContent: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ fontFamily: inter }}>
    {/* Breadcrumb */}
    <div
      style={{
        ...fadeUp(frame, 0),
        display: "flex",
        gap: 8,
        fontSize: 13,
        color: textSecondary,
        marginBottom: 6,
      }}
    >
      <span>Projects</span>
      <span style={{ color: muted }}>{"/"}</span>
      <span>MyApp Frontend</span>
      <span style={{ color: muted }}>{"/"}</span>
      <span style={{ color: textPrimary }}>Env Vault</span>
    </div>
    <div
      style={{
        ...fadeUp(frame, 0),
        fontSize: 24,
        fontWeight: 700,
        fontFamily: syne,
        color: textPrimary,
        marginBottom: 20,
      }}
    >
      Environment Vault
    </div>

    {/* Environment tabs */}
    <div style={{ ...fadeUp(frame, 6), display: "flex", gap: 4, marginBottom: 20 }}>
      {["Development", "Staging", "Production"].map((env, i) => (
        <div
          key={env}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: i === 0 ? 600 : 400,
            color: i === 0 ? textPrimary : textSecondary,
            backgroundColor: i === 0 ? "rgba(16,185,129,0.12)" : "transparent",
            border: `1px solid ${i === 0 ? "rgba(16,185,129,0.3)" : glassBorder}`,
          }}
        >
          {env}
        </div>
      ))}
    </div>

    {/* Vault table */}
    <GlassCard style={{ padding: 0, overflow: "hidden", ...fadeUp(frame, 12) }}>
      <div
        style={{
          display: "flex",
          padding: "10px 20px",
          backgroundColor: "rgba(16,185,129,0.06)",
          borderBottom: `1px solid ${glassBorder}`,
          fontSize: 12,
          fontWeight: 600,
          color: textSecondary,
          textTransform: "uppercase" as const,
          letterSpacing: 0.5,
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
                fontFamily: mono,
                fontSize: 12,
                color: textPrimary,
                fontWeight: 500,
              }}
            >
              {v.key}
            </span>
            <span style={{ flex: 2, fontFamily: mono, fontSize: 12, color: textSecondary }}>
              {"•".repeat(16)}
            </span>
            <span style={{ width: 80, textAlign: "center" }}>
              {v.required ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: green,
                  }}
                />
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.15)",
                  }}
                />
              )}
            </span>
            <span
              style={{
                width: 80,
                textAlign: "center",
                fontSize: 12,
                color: v.ageColor,
              }}
            >
              {v.age}
            </span>
          </div>
        );
      })}
    </GlassCard>
  </div>
);

/* ── Main Scene ──────────────────────────────────────────── */

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [300, 319], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sidebarX = interpolate(frame, [0, 18], [-240, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const showDash = frame < 130;
  const showAnalysis = frame >= 115 && frame < 230;
  const showVault = frame >= 220;

  const dashOp = showDash
    ? frame > 115
      ? interpolate(frame, [115, 130], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1
    : 0;

  const analysisOp = showAnalysis
    ? interpolate(frame, [115, 130, 215, 230], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const vaultOp = showVault
    ? interpolate(frame, [220, 235], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const activeNav = frame < 115 ? "dashboard" : frame < 220 ? "projects" : "projects";

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), backgroundColor: bg }}>
      {/* Background gradient mesh */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 600px 400px at 70% 20%, rgba(16,185,129,0.06), transparent),
            radial-gradient(ellipse 500px 350px at 30% 70%, rgba(34,211,238,0.04), transparent),
            radial-gradient(ellipse 400px 300px at 85% 80%, rgba(245,158,11,0.03), transparent)
          `,
        }}
      />

      <Sidebar translateX={sidebarX} active={activeNav} />

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
        {showDash && (
          <div style={{ position: "absolute", inset: "36px 44px", opacity: dashOp }}>
            <DashboardContent frame={frame} />
          </div>
        )}
        {showAnalysis && (
          <div style={{ position: "absolute", inset: "36px 44px", opacity: analysisOp }}>
            <AnalysisContent frame={frame - 115} />
          </div>
        )}
        {showVault && (
          <div style={{ position: "absolute", inset: "36px 44px", opacity: vaultOp }}>
            <VaultContent frame={frame - 220} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
