import { createTheme } from "@mui/material/styles";
import { componentOverrides } from "./overrides";
import { palette } from "./palette";
import { appStyleTokens } from "./style-tokens";
import { typography } from "./typography";

export const theme = createTheme({
  cssVariables: true,
  palette,
  typography,
  shape: { borderRadius: appStyleTokens.radius },
  app: appStyleTokens,
  components: componentOverrides,
});
