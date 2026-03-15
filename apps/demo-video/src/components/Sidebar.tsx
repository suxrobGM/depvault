import type { ReactElement } from "react";
import { alpha, colors, fonts } from "./constants";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "activity", label: "Activity", icon: "clock" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "converter", label: "Converter", icon: "swap" },
  { id: "settings", label: "Settings", icon: "gear" },
];

interface NavIconProps {
  type: string;
  active: boolean;
}

function NavIcon(props: NavIconProps): ReactElement {
  const { type, active } = props;
  const color = active ? colors.primary : colors.textSecondary;
  const s = 18;
  const common: React.CSSProperties = {
    width: s,
    height: s,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    folder: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
    clock: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    shield: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    swap: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
    gear: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  };

  return <div style={common}>{icons[type]}</div>;
}

interface SidebarProps {
  translateX?: number;
  active: string;
}

export function Sidebar(props: SidebarProps): ReactElement {
  const { translateX = 0, active } = props;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 240,
        backgroundColor: colors.paper,
        borderRight: `1px solid ${colors.glassBorder}`,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        flexDirection: "column",
        fontFamily: fonts.body,
        zIndex: 10,
      }}
    >
      {/* Logo + collapse chevron */}
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${colors.glassBorder}`,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: fonts.display,
            color: colors.primary,
            letterSpacing: -0.5,
          }}
        >
          DepVault
        </span>
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textSecondary}
          strokeWidth={2}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: "8px 8px" }}>
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
                backgroundColor: isActive ? colors.glowPrimary : "transparent",
                borderLeft: isActive ? `3px solid ${colors.primary}` : "3px solid transparent",
                color: isActive ? colors.textPrimary : colors.textSecondary,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <NavIcon type={item.icon} active={isActive} />
              {item.label}
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      <div style={{ padding: "4px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 8,
            color: colors.textSecondary,
            fontSize: 14,
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textSecondary}
            strokeWidth={2}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Feedback
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.glassBorder}` }} />

      {/* Notification bell */}
      <div style={{ padding: "4px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 8,
            color: colors.textSecondary,
            fontSize: 14,
            position: "relative",
          }}
        >
          <div style={{ position: "relative" }}>
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.textSecondary}
              strokeWidth={2}
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div
              style={{
                position: "absolute",
                top: -4,
                right: -6,
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: colors.error,
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              3
            </div>
          </div>
          Notifications
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.glassBorder}` }} />

      {/* User */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: alpha(colors.primary, 0.12),
            border: `1px solid ${alpha(colors.primary, 0.2)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.primary,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          AJ
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
            Alex Johnson
          </div>
          <div style={{ color: colors.textSecondary, fontSize: 11 }}>alex@company.com</div>
        </div>
      </div>
    </div>
  );
}
