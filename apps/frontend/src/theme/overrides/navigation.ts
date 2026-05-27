import type { Components, Theme } from "@mui/material/styles";

export const navigationOverrides: Components<Theme> = {
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.vault.glassBorder}`,
      }),
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.vault.glassBg,
        backdropFilter: `blur(${theme.app.blur + 4}px)`,
        boxShadow: "none",
        borderBottom: `1px solid ${theme.palette.vault.glassBorder}`,
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 8,
        borderLeft: "3px solid transparent",
        transition: "all 0.2s ease",
        "&.Mui-selected": {
          borderLeftColor: theme.palette.primary.main,
          backgroundColor: theme.palette.vault.glowPrimary,
          "&:hover": {
            backgroundColor: theme.palette.vault.glowPrimary,
          },
        },
      }),
    },
  },
};
