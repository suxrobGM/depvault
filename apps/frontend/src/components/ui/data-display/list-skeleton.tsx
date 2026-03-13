import type { ReactElement } from "react";
import { Skeleton, Stack } from "@mui/material";

interface ListSkeletonProps {
  count?: number;
  height?: number;
  spacing?: number;
}

/** Renders a vertical stack of rounded skeleton placeholders with fading opacity. */
export function ListSkeleton(props: ListSkeletonProps): ReactElement {
  const { count = 5, height = 64, spacing = 1.5 } = props;

  return (
    <Stack spacing={spacing}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={height}
          sx={{ borderRadius: 2, opacity: 1 - i * 0.15 }}
        />
      ))}
    </Stack>
  );
}
