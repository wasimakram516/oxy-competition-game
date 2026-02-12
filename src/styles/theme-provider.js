"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e",
    },
    secondary: {
      main: "#b45309",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
  },
});

export default function AppThemeProvider({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
