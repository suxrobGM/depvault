import { alpha, type Components, type Theme } from "@mui/material/styles";

export const feedbackOverrides: Components<Theme> = {
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: theme.palette.vault.surface,
        border: `1px solid ${theme.palette.vault.glassBorder}`,
        color: theme.palette.text.primary,
        fontSize: "0.75rem",
      }),
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.app.radius,
        border: "1px solid",
        variants: (["error", "warning", "success", "info"] as const).map((severity) => ({
          props: { variant: "standard", severity },
          style: {
            backgroundColor: alpha(theme.palette[severity].main, 0.1),
            borderColor: alpha(theme.palette[severity].main, 0.2),
          },
        })),
      }),
    },
  },
  MuiSkeleton: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.text.secondary, 0.08),
      }),
    },
  },
};
