"use client";

import type { PropsWithChildren, ReactElement } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { theme } from "@/src/theme";

export default function ThemeProvider({ children }: PropsWithChildren): ReactElement {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}
