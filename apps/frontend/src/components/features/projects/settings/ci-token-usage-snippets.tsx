"use client";

import { useState, type ReactElement } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { CopyButton } from "@/components/ui/inputs";

const GITHUB_ACTIONS_SNIPPET = `# Add DEPVAULT_TOKEN to your repository secrets
- name: Setup DepVault CLI
  uses: suxrobGM/depvault@v1
  with:
    token: \${{ secrets.DEPVAULT_TOKEN }}

- name: Pull secrets
  run: |
    depvault ci pull --format env --output .env
    cat .env >> $GITHUB_ENV`;

const GITLAB_CI_SNIPPET = `# Add DEPVAULT_TOKEN as a masked CI/CD variable
before_script:
  - curl -fsSL https://get.depvault.com | bash

script:
  - depvault ci pull --format env --output .env
  variables:
    DEPVAULT_TOKEN: $DEPVAULT_TOKEN`;

export function CiTokenUsageSnippets(): ReactElement {
  const [tab, setTab] = useState(0);
  const snippet = tab === 0 ? GITHUB_ACTIONS_SNIPPET : GITLAB_CI_SNIPPET;

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          mb: 0.5,
          display: "block",
        }}
      >
        Integration examples
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 32 }}>
        <Tab label="GitHub Actions" sx={{ minHeight: 32, py: 0.5, textTransform: "none" }} />
        <Tab label="GitLab CI" sx={{ minHeight: 32, py: 0.5, textTransform: "none" }} />
      </Tabs>
      <Box sx={{ position: "relative", mt: 1 }}>
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
          }}
        >
          <CopyButton value={snippet} />
        </Box>
        <Box
          sx={{
            p: 1.5,
            pr: 5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "action.hover",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          {snippet}
        </Box>
      </Box>
    </Box>
  );
}
