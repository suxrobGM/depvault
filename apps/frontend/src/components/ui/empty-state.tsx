import type { ReactElement, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState(props: EmptyStateProps): ReactElement {
  const { icon, title, description, actionLabel, onAction } = props;

  return (
    <Box className="flex min-h-[30vh] flex-col items-center justify-center gap-2 py-8">
      {icon && <Box sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}>{icon}</Box>}
      <Typography variant="h6" color="text.secondary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 2 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
