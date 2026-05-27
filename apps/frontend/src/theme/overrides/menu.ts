import type { Components, Theme } from "@mui/material/styles";

export const menuOverrides: Components<Theme> = {
  MuiMenu: {
    styleOverrides: {
      paper: ({ theme }) => ({
        backgroundImage: "none",
        backgroundColor: theme.palette.vault.surface,
        border: `1px solid ${theme.palette.vault.glassBorder}`,
        boxShadow: theme.app.shadow.elevated,
      }),
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 6,
        margin: "2px 6px",
        "&:hover": {
          backgroundColor: theme.palette.vault.glowPrimary,
        },
      }),
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        backgroundImage: "none",
        backgroundColor: theme.palette.vault.glassBg,
        backdropFilter: `blur(${theme.app.blur}px)`,
        border: `1px solid ${theme.palette.vault.glassBorder}`,
        overflowX: "hidden",
      }),
    },
  },
};
