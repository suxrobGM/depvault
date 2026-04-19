"use client";

import { useState, type ReactElement } from "react";
import { ExpandMore as ExpandIcon, Folder as FolderIcon } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import type { VaultGroup } from "@/types/api/vault-group";
import { VaultGroupCard } from "./vault-group-card";

interface VaultGroupListProps {
  projectId: string;
  groups: VaultGroup[];
  canEdit: boolean;
}

export function VaultGroupList(props: VaultGroupListProps): ReactElement {
  const { projectId, groups, canEdit } = props;

  const [expandedId, setExpandedId] = useState<string | null>(
    groups.length === 1 ? (groups[0]?.id ?? null) : null,
  );

  const handleAccordionChange = (groupId: string) => {
    setExpandedId((prev) => (prev === groupId ? null : groupId));
  };

  return (
    <Stack spacing={1.5}>
      {groups.map((group, index) => {
        const delayClass = index < 8 ? `vault-delay-${index + 1}` : "vault-delay-8";

        return (
          <Accordion
            key={group.id}
            expanded={expandedId === group.id}
            onChange={() => handleAccordionChange(group.id)}
            className={`vault-fade-up ${delayClass}`}
            disableGutters
            sx={{
              bgcolor: "vault.glassBg",
              border: 1,
              borderColor: "vault.glassBorder",
              borderRadius: "12px !important",
              "&::before": { display: "none" },
              "&.Mui-expanded": {
                borderColor: "primary.main",
                boxShadow: (t) => `0 0 16px ${t.palette.primary.main}1a`,
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandIcon />}
              sx={{
                px: 2.5,
                py: 0.5,
                "& .MuiAccordionSummary-content": { alignItems: "center", gap: 2 },
              }}
            >
              <FolderIcon sx={{ color: "primary.main", fontSize: 22 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle1"
                  noWrap
                  sx={{
                    fontWeight: 600,
                  }}
                >
                  {group.name}
                </Typography>
                {group.directoryPath && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: "text.secondary",
                      fontFamily: "monospace",
                    }}
                  >
                    {group.directoryPath}
                  </Typography>
                )}
                {!group.directoryPath && group.description && (
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {group.description}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Chip
                  label={`${group.environmentCount} env${group.environmentCount !== 1 ? "s" : ""}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${group.variableCount} var${group.variableCount !== 1 ? "s" : ""}`}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
              <VaultGroupCard projectId={projectId} group={group} canEdit={canEdit} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}
