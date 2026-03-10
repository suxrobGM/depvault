import { alpha, createTheme, type CSSProperties } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    vault: {
      surface: string;
      glassBg: string;
      glassBorder: string;
      glowPrimary: string;
      glowSecondary: string;
    };
  }
  interface PaletteOptions {
    vault?: {
      surface?: string;
      glassBg?: string;
      glassBorder?: string;
      glowPrimary?: string;
      glowSecondary?: string;
    };
  }
  interface TypographyVariants {
    mono: CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: { main: "#10b981", light: "#34d399", dark: "#059669", contrastText: "#fff" },
    secondary: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
    error: { main: "#f87171", light: "#fca5a5", dark: "#dc2626" },
    warning: { main: "#fbbf24", light: "#fde68a", dark: "#f59e0b" },
    success: { main: "#34d399", light: "#6ee7b7", dark: "#10b981" },
    info: { main: "#22d3ee", light: "#67e8f9", dark: "#06b6d4" },
    background: { default: "#0a0e17", paper: "#0f1420" },
    text: { primary: "#f1f5f9", secondary: "#94a3b8" },
    divider: "rgba(255, 255, 255, 0.08)",
    vault: {
      surface: "#161c2e",
      glassBg: "rgba(22, 28, 46, 0.6)",
      glassBorder: "rgba(255, 255, 255, 0.08)",
      glowPrimary: "rgba(16, 185, 129, 0.15)",
      glowSecondary: "rgba(245, 158, 11, 0.15)",
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), sans-serif",
    h1: {
      fontFamily: "var(--font-display), var(--font-geist-sans), sans-serif",
      fontSize: "2.25rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontFamily: "var(--font-display), var(--font-geist-sans), sans-serif",
      fontSize: "1.875rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h3: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.01em" },
    h4: { fontSize: "1.25rem", fontWeight: 600 },
    h5: { fontSize: "1.125rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    mono: {
      fontFamily: "var(--font-jetbrains), monospace",
      fontSize: "0.75rem",
    },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": {
          "&::-webkit-scrollbar": { width: 6, height: 6 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(148, 163, 184, 0.3)",
            borderRadius: 3,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgba(16, 185, 129, 0.5)",
          },
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(148, 163, 184, 0.3) transparent",
        },
        body: {
          scrollBehavior: "smooth",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 10 },
        contained: ({ theme: t }) => ({
          backgroundColor: alpha(t.palette.primary.main, 0.15),
          color: t.palette.primary.main,
          border: `1px solid ${alpha(t.palette.primary.main, 0.25)}`,
          backdropFilter: "blur(8px)",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: alpha(t.palette.primary.main, 0.25),
            boxShadow: `0 0 20px ${alpha(t.palette.primary.main, 0.2)}`,
          },
        }),
        outlined: ({ theme: t }) => ({
          borderColor: t.palette.divider,
          backdropFilter: "blur(8px)",
          "&:hover": {
            borderColor: t.palette.primary.main,
            backgroundColor: alpha(t.palette.primary.main, 0.08),
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundImage: "none",
          backgroundColor: t.palette.vault.glassBg,
          backdropFilter: "blur(12px)",
          border: `1px solid ${t.palette.vault.glassBorder}`,
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            borderColor: alpha(t.palette.primary.main, 0.2),
            boxShadow: `0 0 24px ${t.palette.vault.glowPrimary}`,
          },
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { "&:last-child": { paddingBottom: 16 } },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundColor: t.palette.background.paper,
          borderRight: `1px solid ${t.palette.vault.glassBorder}`,
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: t.palette.vault.glassBg,
          backdropFilter: "blur(16px)",
          boxShadow: "none",
          borderBottom: `1px solid ${t.palette.vault.glassBorder}`,
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 10,
          backgroundColor: alpha(t.palette.common.white, 0.03),
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: t.palette.divider,
            transition: "border-color 0.2s ease",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(t.palette.text.secondary, 0.3),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: t.palette.primary.main,
          },
        }),
        input: ({ theme: t }) => ({
          "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus": {
            WebkitBoxShadow: `0 0 0 100px ${t.palette.background.paper} inset`,
            WebkitTextFillColor: t.palette.text.primary,
            caretColor: t.palette.text.primary,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundImage: "none",
          backgroundColor: t.palette.vault.glassBg,
          backdropFilter: "blur(12px)",
          border: `1px solid ${t.palette.vault.glassBorder}`,
        }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          backgroundImage: "none",
          backgroundColor: t.palette.vault.surface,
          border: `1px solid ${t.palette.vault.glassBorder}`,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 6,
          margin: "2px 6px",
          "&:hover": {
            backgroundColor: t.palette.vault.glowPrimary,
          },
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 8,
          borderLeft: "3px solid transparent",
          transition: "all 0.2s ease",
          "&.Mui-selected": {
            borderLeftColor: t.palette.primary.main,
            backgroundColor: t.palette.vault.glowPrimary,
            "&:hover": {
              backgroundColor: t.palette.vault.glowPrimary,
            },
          },
        }),
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: t.palette.vault.surface,
          border: `1px solid ${t.palette.vault.glassBorder}`,
          color: t.palette.text.primary,
          fontSize: "0.75rem",
        }),
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          fontWeight: 600,
          backgroundColor: alpha(t.palette.primary.main, 0.12),
          color: t.palette.primary.main,
          border: `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, border: "1px solid" },
        standardError: ({ theme: t }) => ({
          backgroundColor: alpha(t.palette.error.main, 0.1),
          borderColor: alpha(t.palette.error.main, 0.2),
        }),
        standardWarning: ({ theme: t }) => ({
          backgroundColor: alpha(t.palette.warning.main, 0.1),
          borderColor: alpha(t.palette.warning.main, 0.2),
        }),
        standardSuccess: ({ theme: t }) => ({
          backgroundColor: alpha(t.palette.success.main, 0.1),
          borderColor: alpha(t.palette.success.main, 0.2),
        }),
        standardInfo: ({ theme: t }) => ({
          backgroundColor: alpha(t.palette.info.main, 0.1),
          borderColor: alpha(t.palette.info.main, 0.2),
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderColor: t.palette.vault.glassBorder,
        }),
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundColor: alpha(t.palette.text.secondary, 0.08),
        }),
      },
    },
  },
});
