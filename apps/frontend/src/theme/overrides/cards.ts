import type { Components, Theme } from "@mui/material/styles";

export const cardOverrides: Components<Theme> = {
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: "none",
        backgroundColor: theme.palette.vault.glassBg,
        backdropFilter: `blur(${theme.app.blur}px)`,
        border: `1px solid ${theme.palette.vault.glassBorder}`,
        boxShadow: theme.app.shadow.card,
        transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
      }),
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: { "&:last-child": { paddingBottom: 16 } },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(2.5),
        paddingBottom: 0,
      }),
      avatar: ({ theme }) => ({
        marginRight: theme.spacing(1.5),
        display: "flex",
        alignItems: "center",
      }),
      action: {
        margin: 0,
        alignSelf: "center",
      },
      // Drive title/subheader typography via CSS so call sites can still pass
      // slotProps without clobbering the variant.
      title: ({ theme }) => theme.typography.h6,
      subheader: ({ theme }) => ({
        ...theme.typography.body2,
        color: theme.palette.text.secondary,
      }),
    },
  },
  MuiCardActions: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(2.5),
        justifyContent: "flex-end",
      }),
    },
  },
};
