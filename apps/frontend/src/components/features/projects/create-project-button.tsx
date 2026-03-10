"use client";

import { useState, type ReactElement } from "react";
import { Add as AddIcon } from "@mui/icons-material";
import { Button } from "@mui/material";
import { CreateProjectDialog } from "./create-project-dialog";

export function CreateProjectButton(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
        Create Project
      </Button>
      <CreateProjectDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
