import type { Components, Theme } from "@mui/material/styles";
import { baseOverrides } from "./base";
import { buttonOverrides } from "./buttons";
import { cardOverrides } from "./cards";
import { dataDisplayOverrides } from "./data-display";
import { feedbackOverrides } from "./feedback";
import { inputOverrides } from "./inputs";
import { menuOverrides } from "./menu";
import { navigationOverrides } from "./navigation";
import { typographyOverrides } from "./typography";

export const componentOverrides: Components<Theme> = {
  ...baseOverrides,
  ...buttonOverrides,
  ...cardOverrides,
  ...inputOverrides,
  ...navigationOverrides,
  ...menuOverrides,
  ...feedbackOverrides,
  ...dataDisplayOverrides,
  ...typographyOverrides,
};
