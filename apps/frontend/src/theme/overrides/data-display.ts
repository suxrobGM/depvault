import { alpha, type Components, type Theme } from "@mui/material/styles";

export const dataDisplayOverrides: Components<Theme> = {
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 6, fontWeight: 500 },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: ({ theme }) => ({
        fontWeight: 600,
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
        color: theme.palette.primary.main,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }),
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderColor: theme.palette.vault.glassBorder,
      }),
    },
  },
};
