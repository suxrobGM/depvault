import { alpha, type Components, type Theme } from "@mui/material/styles";

export const inputOverrides: Components<Theme> = {
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.app.radius,
        backgroundColor: alpha(theme.palette.common.white, 0.03),
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.divider,
          transition: "border-color 0.2s ease",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: alpha(theme.palette.text.secondary, 0.3),
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      }),
      input: ({ theme }) => ({
        "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus": {
          WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
          WebkitTextFillColor: theme.palette.text.primary,
          caretColor: theme.palette.text.primary,
        },
      }),
    },
  },
};
