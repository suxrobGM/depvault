import { alpha, type Components, type Theme } from "@mui/material/styles";

export const buttonOverrides: Components<Theme> = {
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        textTransform: "none",
        fontWeight: 600,
        borderRadius: theme.app.radius,
      }),
      contained: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.primary.main, 0.15),
        color: theme.palette.primary.main,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
        backdropFilter: `blur(${theme.app.blur / 1.5}px)`,
        boxShadow: "none",
        "&:hover": {
          backgroundColor: alpha(theme.palette.primary.main, 0.25),
          boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }),
      outlined: ({ theme }) => ({
        borderColor: theme.palette.divider,
        backdropFilter: `blur(${theme.app.blur / 1.5}px)`,
        "&:hover": {
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
      }),
    },
  },
};
