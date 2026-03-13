import type { ReactElement } from "react";
import { MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

interface PaginationBarProps {
  count: number;
  page: number;
  onChange: (page: number) => void;
  total?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

/** Pagination bar with optional page size selector and total count. */
export function PaginationBar(props: PaginationBarProps): ReactElement {
  const {
    count,
    page,
    onChange,
    total,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  } = props;

  const showPageSize = pageSize !== undefined && onPageSizeChange !== undefined;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ p: 1.5 }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
        {showPageSize && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary" noWrap>
              Rows per page
            </Typography>
            <TextField
              select
              size="small"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onChange(1);
              }}
              sx={{ minWidth: 72, "& .MuiInputBase-input": { py: 0.5, fontSize: 13 } }}
            >
              {pageSizeOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
        {total != null && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {total} {total === 1 ? "result" : "results"}
          </Typography>
        )}
      </Stack>

      <Pagination
        count={count}
        page={page}
        onChange={(_, value) => onChange(value)}
        shape="rounded"
        size="small"
        sx={{
          "& .MuiPaginationItem-root": {
            borderColor: "divider",
          },
        }}
      />
    </Stack>
  );
}
