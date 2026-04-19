"use client";

import type { ReactElement } from "react";
import {
  KeyboardArrowUp as CollapseIcon,
  KeyboardArrowDown as ExpandIcon,
} from "@mui/icons-material";
import { Box, Chip, Collapse, IconButton, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { StatusBadge } from "@/components/ui/data-display";
import type { Dependency } from "@/types/api/analysis";
import { getPackageUrl, STATUS_LABEL, STATUS_VARIANT } from "./analysis-utils";
import { VulnerabilityPanel } from "./vulnerability-panel";

interface DependencyRowProps {
  dep: Dependency;
  ecosystem?: string;
  expanded: boolean;
  gridColumns: string;
  onToggle: () => void;
}

/**
 * A single row in the dependency data grid. Displays basic info about the dependency and its vulnerabilities if expanded.
 */
export function DependencyRow(props: DependencyRowProps): ReactElement {
  const { dep, ecosystem, expanded, gridColumns, onToggle } = props;
  const hasVulns = dep.vulnerabilities.length > 0;
  const versionDiffers = dep.latestVersion && dep.latestVersion !== dep.currentVersion;
  const packageUrl = ecosystem ? getPackageUrl(ecosystem, dep.name) : null;

  return (
    <Box>
      <Box
        role={hasVulns ? "button" : undefined}
        tabIndex={hasVulns ? 0 : undefined}
        onClick={hasVulns ? onToggle : undefined}
        onKeyDown={
          hasVulns
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        sx={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderRadius: 1.5,
          bgcolor: expanded
            ? (t) => alpha(t.palette.error.main, 0.04)
            : (t) => alpha(t.palette.background.paper, 0.25),
          border: 1,
          borderColor: expanded ? (t) => alpha(t.palette.error.main, 0.2) : "divider",
          transition: "all 0.15s ease",
          cursor: hasVulns ? "pointer" : "default",
          "&:hover": hasVulns
            ? {
                bgcolor: (t) => alpha(t.palette.error.main, 0.06),
                borderColor: (t) => alpha(t.palette.error.main, 0.25),
              }
            : {
                bgcolor: (t) => alpha(t.palette.background.paper, 0.4),
              },
        }}
      >
        {packageUrl ? (
          <Typography
            variant="body2"
            noWrap
            component="a"
            href={packageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            sx={{
              fontWeight: 600,
              color: "primary.main",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {dep.name}
          </Typography>
        ) : (
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 600,
            }}
          >
            {dep.name}
          </Typography>
        )}

        <Typography
          variant="mono"
          sx={{
            color: "text.secondary",
          }}
        >
          {dep.currentVersion}
        </Typography>

        <Typography variant="mono" color={versionDiffers ? "primary.main" : "text.disabled"}>
          {dep.latestVersion ?? "\u2014"}
        </Typography>

        <Box>
          <StatusBadge
            label={STATUS_LABEL[dep.status] ?? dep.status}
            variant={STATUS_VARIANT[dep.status] ?? "default"}
          />
        </Box>

        <Box>
          <Tooltip title={dep.licensePolicy} placement="top">
            <Chip
              label={dep.license ?? "Unknown"}
              size="small"
              color={
                dep.licensePolicy === "BLOCK"
                  ? "error"
                  : dep.licensePolicy === "WARN"
                    ? "warning"
                    : "default"
              }
              variant="outlined"
              sx={{ maxWidth: 100, fontSize: "0.7rem" }}
            />
          </Tooltip>
        </Box>

        <Box>
          {hasVulns ? (
            <Chip
              label={dep.vulnerabilities.length}
              size="small"
              color="error"
              sx={{ minWidth: 32, fontWeight: 700 }}
            />
          ) : (
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
              }}
            >
              0
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {hasVulns && (
            <IconButton size="small" sx={{ p: 0.25 }}>
              {expanded ? (
                <CollapseIcon sx={{ fontSize: 18 }} />
              ) : (
                <ExpandIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          )}
        </Box>
      </Box>
      <Collapse in={expanded}>
        {hasVulns && (
          <Box
            sx={{
              ml: 2.5,
              mr: 2.5,
              mt: -0.5,
              mb: 0.5,
              p: 2,
              bgcolor: (t) => alpha(t.palette.error.main, 0.03),
              borderRadius: "0 0 8px 8px",
              borderLeft: 1,
              borderRight: 1,
              borderBottom: 1,
              borderColor: (t) => alpha(t.palette.error.main, 0.15),
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "error.main",
                mb: 1,
                display: "block",
              }}
            >
              {dep.vulnerabilities.length} VULNERABILIT
              {dep.vulnerabilities.length === 1 ? "Y" : "IES"}
            </Typography>
            <VulnerabilityPanel vulnerabilities={dep.vulnerabilities} />
          </Box>
        )}
      </Collapse>
    </Box>
  );
}
