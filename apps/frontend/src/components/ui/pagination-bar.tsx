import type { ReactElement } from "react";
import { Pagination, Stack } from "@mui/material";

interface PaginationBarProps {
  count: number;
  page: number;
  onChange: (page: number) => void;
}

/**
 * A pagination bar component that displays page numbers and allows users to navigate between pages.
 */
export function PaginationBar(props: PaginationBarProps): ReactElement {
  const { count, page, onChange } = props;

  return (
    <Stack alignItems="center" sx={{ pt: 2.5 }}>
      <Pagination
        count={count}
        page={page}
        onChange={(_, value) => onChange(value)}
        shape="rounded"
        sx={{
          "& .MuiPaginationItem-root": {
            borderColor: "divider",
          },
        }}
      />
    </Stack>
  );
}
