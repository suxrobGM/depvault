import { useState, type MouseEvent, type ReactElement } from "react";
import {
  BugReport as BugReportIcon,
  Feedback as FeedbackIcon,
  Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import { List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";

const REPORT_BUG_URL = "https://github.com/suxrobGM/depvault/issues/new?template=bug_report.yml";
const FEATURE_REQUEST_URL =
  "https://github.com/suxrobGM/depvault/issues/new?template=feature_request.yml";

interface FeedbackMenuProps {
  open: boolean;
}

export function FeedbackMenu(props: FeedbackMenuProps): ReactElement {
  const { open } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <List sx={{ px: open ? 1 : 0.5 }}>
      <ListItemButton
        onClick={handleOpen}
        sx={{
          mb: 0.5,
          justifyContent: open ? "initial" : "center",
          px: open ? 2 : 1.5,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: open ? 40 : "auto",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          <FeedbackIcon />
        </ListItemIcon>
        {open && <ListItemText primary="Feedback" />}
      </ListItemButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "right", vertical: "center" }}
        transformOrigin={{ horizontal: "left", vertical: "center" }}
      >
        <MenuItem
          component="a"
          href={REPORT_BUG_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClose}
        >
          <ListItemIcon>
            <BugReportIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Report a Bug</ListItemText>
        </MenuItem>
        <MenuItem
          component="a"
          href={FEATURE_REQUEST_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClose}
        >
          <ListItemIcon>
            <LightbulbIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Feature Request</ListItemText>
        </MenuItem>
      </Menu>
    </List>
  );
}
