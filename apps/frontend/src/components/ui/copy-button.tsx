"use client";

import { useState, type ReactElement } from "react";
import { Check, ContentCopy } from "@mui/icons-material";
import { Button, IconButton, Tooltip } from "@mui/material";
import { useToast } from "@/hooks/use-toast";

interface CopyButtonProps {
  value: string;
  size?: "small" | "medium";
  /** When provided, shows a toast notification after copying. */
  notification?: string;
  /** When provided, renders a full Button with this label instead of an IconButton. */
  label?: string;
  /** Button variant when using label mode. Defaults to "contained". */
  variant?: "contained" | "outlined" | "text";
  /** Full width when using label mode. */
  fullWidth?: boolean;
}

export function CopyButton(props: CopyButtonProps): ReactElement {
  const { value, size = "small", notification, label, variant = "contained", fullWidth } = props;
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (notification) {
      toast.success(notification);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  if (label) {
    return (
      <Button
        variant={variant}
        startIcon={copied ? <Check /> : <ContentCopy />}
        onClick={handleCopy}
        fullWidth={fullWidth}
      >
        {label}
      </Button>
    );
  }

  return (
    <Tooltip title={copied ? "Copied!" : "Copy"}>
      <IconButton size={size} onClick={handleCopy} aria-label="Copy to clipboard">
        {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
