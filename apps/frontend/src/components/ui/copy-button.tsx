"use client";

import { useState, type ReactElement } from "react";
import { Check, ContentCopy } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";

interface CopyButtonProps {
  value: string;
  size?: "small" | "medium";
}

export function CopyButton(props: CopyButtonProps): ReactElement {
  const { value, size = "small" } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? "Copied!" : "Copy"}>
      <IconButton size={size} onClick={handleCopy}>
        {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
