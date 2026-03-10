"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon, CloudUpload as UploadIcon } from "@mui/icons-material";
import { Dialog, DialogContent, DialogTitle, Tab, Tabs } from "@mui/material";
import { GitHubTabContent } from "./github-tab-content";
import { UploadTabContent } from "./upload-tab-content";

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
      <DialogContent sx={{ overflowX: "hidden" }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
          <Tab icon={<UploadIcon />} iconPosition="start" label="Upload" />
          <Tab icon={<GitHubIcon />} iconPosition="start" label="GitHub" />
        </Tabs>
        {tabIndex === 0 ? (
          <UploadTabContent projectId={projectId} onClose={handleClose} />
        ) : (
          <GitHubTabContent projectId={projectId} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
