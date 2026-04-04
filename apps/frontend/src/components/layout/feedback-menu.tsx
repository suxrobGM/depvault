import { useState, type MouseEvent, type ReactElement } from "react";
import {
  BugReport as BugReportIcon,
  Feedback as FeedbackIcon,
  Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";

const REPORT_BUG_URL = "https://github.com/suxrobGM/depvault/issues/new?template=bug_report.yml";
const FEATURE_REQUEST_URL =
  "https://github.com/suxrobGM/depvault/issues/new?template=feature_request.yml";

export function FeedbackMenu(): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Feedback" placement="top">
        <IconButton size="small" onClick={handleOpen} sx={{ color: "text.secondary" }}>
          <FeedbackIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "center", vertical: "top" }}
        transformOrigin={{ horizontal: "center", vertical: "bottom" }}
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
    </>
  );
}
