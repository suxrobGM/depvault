"use client";

import type { ReactElement } from "react";
import {
  CalendarToday as CalendarIcon,
  GitHub as GitHubIcon,
  Group as GroupIcon,
  OpenInNew as OpenInNewIcon,
  Update as UpdateIcon,
} from "@mui/icons-material";
import { Box, Button, CardContent, Grid, Stack, Typography } from "@mui/material";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBox } from "@/components/ui/icon-box";
import type { ProjectResponse } from "@/types/api/project";

interface OverviewTabProps {
  project: ProjectResponse;
  memberCount: number;
}

export function OverviewTab(props: OverviewTabProps): ReactElement {
  const { project, memberCount } = props;

  return (
    <Grid container spacing={3} className="vault-fade-up vault-delay-2">
      <Grid size={{ xs: 12, md: 8 }}>
        <GlassCard>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              About
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {project.description || "No description provided."}
            </Typography>
            {project.repositoryUrl && (
              <Button
                component="a"
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
                startIcon={
                  project.repositoryUrl.includes("github.com") ? <GitHubIcon /> : <OpenInNewIcon />
                }
              >
                View Repository
              </Button>
            )}
            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <UpdateIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </GlassCard>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <GlassCard>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Quick Stats
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <IconBox color="var(--mui-palette-primary-main)" size={40}>
                  <GroupIcon sx={{ fontSize: 20 }} />
                </IconBox>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {memberCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Members
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );
}
