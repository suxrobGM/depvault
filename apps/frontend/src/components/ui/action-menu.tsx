"use client";

import { useState, type ReactElement } from "react";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";

/** A single entry in an ActionMenu. Set `hidden: true` to conditionally exclude an item. */
export interface ActionMenuItem {
  label: string;
  icon?: ReactElement;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  /** Renders the item in `error.main` color. */
  destructive?: boolean;
  /** Renders a divider above this item. */
  dividerBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Disables the trigger button. */
  disabled?: boolean;
}

/** A MoreVert icon button that opens a dropdown menu built from a declarative items array. */
export function ActionMenu(props: ActionMenuProps): ReactElement {
  const { items, disabled } = props;
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const close = () => setAnchor(null);

  const visible = items.filter((item) => !item.hidden);

  return (
    <>
      <IconButton size="small" disabled={disabled} onClick={(e) => setAnchor(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {visible.map((item) => [
          item.dividerBefore && <Divider key={`${item.label}-divider`} />,
          <MenuItem
            key={item.label}
            disabled={item.disabled}
            onClick={() => {
              close();
              item.onClick();
            }}
            sx={item.destructive ? { color: "error.main" } : undefined}
          >
            {item.icon && (
              <ListItemIcon sx={item.destructive ? { color: "error.main" } : undefined}>
                {item.icon}
              </ListItemIcon>
            )}
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>,
        ])}
      </Menu>
    </>
  );
}
