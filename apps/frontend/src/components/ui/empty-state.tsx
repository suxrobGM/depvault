import type { ReactElement, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState(props: EmptyStateProps): ReactElement {
  const { icon, title, description, actionLabel, actionHref, onAction } = props;

  return (
    <Box
      className="vault-fade-up"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "30vh",
        gap: 2,
        py: 8,
        px: 3,
        borderRadius: 3,
        bgcolor: "vault.glassBg",
        border: 1,
        borderColor: "vault.glassBorder",
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "vault.glowPrimary",
            color: "primary.main",
            mb: 1,
            "& .MuiSvgIcon-root": { fontSize: 32 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h5" color="text.secondary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
          {description}
        </Typography>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} style={{ textDecoration: "none" }}>
          <Button variant="contained" sx={{ mt: 2 }}>
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 2 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
