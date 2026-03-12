"use client";

import { useState, type ReactElement } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { CopyButton } from "@/components/ui/copy-button";

const GITHUB_ACTIONS_SNIPPET = `# Add DEPVAULT_CI_TOKEN to your repository secrets
- name: Fetch secrets from DepVault
  run: |
    SECRETS=$(curl -sf \\
      -H "Authorization: Bearer \${{ secrets.DEPVAULT_CI_TOKEN }}" \\
      -H "X-Pipeline-Run-Id: \${{ github.run_id }}" \\
      \${{ vars.DEPVAULT_URL }}/api/ci/secrets)
    echo "$SECRETS" | jq -r '.variables[] | "\\(.key)=\\(.value)"' >> $GITHUB_ENV`;

const GITLAB_CI_SNIPPET = `# Add DEPVAULT_CI_TOKEN and DEPVAULT_URL as CI/CD variables
fetch_secrets:
  script:
    - |
      SECRETS=$(curl -sf \\
        -H "Authorization: Bearer $DEPVAULT_CI_TOKEN" \\
        -H "X-Pipeline-Run-Id: $CI_PIPELINE_ID" \\
        $DEPVAULT_URL/api/ci/secrets)
      echo "$SECRETS" | jq -r '.variables[] | "\\(.key)=\\(.value)"' >> .env
      export $(cat .env | xargs)`;

export function CiTokenUsageSnippets(): ReactElement {
  const [tab, setTab] = useState(0);
  const snippet = tab === 0 ? GITHUB_ACTIONS_SNIPPET : GITLAB_CI_SNIPPET;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
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
