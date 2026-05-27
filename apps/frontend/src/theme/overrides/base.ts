import type { Components, Theme } from "@mui/material/styles";

export const baseOverrides: Components<Theme> = {
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
};
