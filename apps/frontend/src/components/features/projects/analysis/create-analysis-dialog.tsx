"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon, CloudUpload as UploadIcon } from "@mui/icons-material";
import { Dialog, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import { GitHubTab } from "./github-tab";
import { UploadTab } from "./upload-tab";

interface CreateAnalysisDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateAnalysisDialog(props: CreateAnalysisDialogProps): ReactElement {
  const { open, onClose, projectId } = props;
  const [tabIndex, setTabIndex] = useState(0);

  const handleClose = () => {
    setTabIndex(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Analysis</DialogTitle>
      <DialogContent>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
          <Tab icon={<UploadIcon />} iconPosition="start" label="Upload" />
          <Tab icon={<GitHubIcon />} iconPosition="start" label="GitHub" />
        </Tabs>
        {tabIndex === 0 ? (
          <UploadTab projectId={projectId} onClose={handleClose} />
        ) : (
          <GitHubTab projectId={projectId} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
