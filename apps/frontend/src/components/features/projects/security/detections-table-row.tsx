"use client";

import { type ReactElement } from "react";
import {
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  RemoveCircleOutline as FalsePositiveIcon,
  CheckCircle as ResolveIcon,
} from "@mui/icons-material";
import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import type { DetectionResponse } from "@/types/api/secret-scan";

const SEVERITY_COLORS: Record<string, "error" | "warning" | "info" | "success"> = {
  CRITICAL: "error",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "success",
};

const STATUS_COLORS: Record<string, "error" | "success" | "default"> = {
  OPEN: "error",
  RESOLVED: "success",
  FALSE_POSITIVE: "default",
};

interface DetectionTableRowProps {
  detection: DetectionResponse;
  expanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  onFalsePositive: () => void;
  isUpdating: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}

export function DetectionTableRow(props: DetectionTableRowProps): ReactElement {
  const {
    detection,
    expanded,
    onToggle,
    onResolve,
    onFalsePositive,
    isUpdating,
    selected,
    onSelect,
  } = props;

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: "pointer",
          "& > *": { borderBottom: expanded ? "none !important" : undefined },
        }}
        onClick={onToggle}
      >
        <TableCell padding="checkbox">
          <Checkbox
            size="small"
            checked={selected ?? false}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onSelect?.(e.target.checked)}
          />
        </TableCell>

        <TableCell>
          <IconButton size="small">{expanded ? <CollapseIcon /> : <ExpandIcon />}</IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontFamily="monospace" fontSize={12}>
            {detection.commitHash.slice(0, 7)}
          </Typography>
        </TableCell>
        <TableCell>
          <Tooltip title={detection.filePath} placement="top-start" enterDelay={300}>
            <Typography variant="body2" fontSize={13} sx={{ maxWidth: 250 }} noWrap>
              {detection.filePath}
            </Typography>
          </Tooltip>
          {detection.lineNumber && (
            <Typography variant="caption" color="text.secondary">
              Line {detection.lineNumber}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontSize={13}>
            {detection.patternName}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={detection.patternSeverity}
            size="small"
            color={SEVERITY_COLORS[detection.patternSeverity] ?? "default"}
          />
        </TableCell>
        <TableCell>
          <Chip
            label={detection.status.replace("_", " ")}
            size="small"
            color={STATUS_COLORS[detection.status] ?? "default"}
            variant="outlined"
          />
        </TableCell>
        <TableCell align="right">
          {detection.status === "OPEN" && (
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
              <Tooltip title="Mark as resolved">
                <IconButton
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve();
                  }}
                  disabled={isUpdating}
                >
                  <ResolveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Mark as false positive">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFalsePositive();
                  }}
                  disabled={isUpdating}
                >
                  <FalsePositiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    File
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontSize={12}
                    sx={{ mt: 0.5, wordBreak: "break-all" }}
                  >
                    {detection.filePath}
                    {detection.lineNumber ? `:${detection.lineNumber}` : ""}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Matched Snippet
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontSize={12}
                    sx={{
                      mt: 0.5,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: "action.hover",
                    }}
                  >
                    {detection.matchSnippet}
                  </Typography>
                </Box>
                {detection.remediationSteps && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Remediation
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {detection.remediationSteps}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
