"use client";

import { useState, type ReactElement } from "react";
import { Alert, AlertTitle, Button, CircularProgress } from "@mui/material";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useVault } from "@/hooks/use-vault";
import { client } from "@/lib/api";

interface PendingMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  hasVault: boolean;
  publicKey: string | null;
}

interface PendingKeyGrantsBannerProps {
  projectId: string;
  canEdit: boolean;
}

/** Shows a banner when project members are waiting for vault access (key grants). */
export function PendingKeyGrantsBanner(props: PendingKeyGrantsBannerProps): ReactElement {
  const { projectId, canEdit } = props;
  const { user } = useAuth();
  const { isVaultUnlocked, grantProjectKeyToMember } = useVault();
  const [granting, setGranting] = useState(false);

  const { data: pendingMembers, refetch } = useApiQuery<PendingMember[]>(
    ["projects", projectId, "key-grants", "pending"],
    () => client.api.projects({ id: projectId })["key-grants"].pending.get(),
    { enabled: canEdit && isVaultUnlocked },
  );

  // Exclude the current user — they get auto-initialized via getProjectDEK
  const grantableMembers =
    pendingMembers?.filter((m) => m.userId !== user?.id && m.hasVault && m.publicKey) ?? [];

  if (!canEdit || !isVaultUnlocked || grantableMembers.length === 0) {
    return <></>;
  }

  const handleGrantAccess = async () => {
    setGranting(true);
    try {
      for (const member of grantableMembers) {
        await grantProjectKeyToMember(projectId, member.userId, member.publicKey!);
      }
      await refetch();
    } catch {
      // Errors are surfaced by the API layer
    } finally {
      setGranting(false);
    }
  };

  const memberCount = grantableMembers.length;
  const label =
    memberCount === 1
      ? "1 team member needs vault access"
      : `${memberCount} team members need vault access`;

  return (
    <Alert
      severity="info"
      sx={{ mb: 3 }}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={handleGrantAccess}
          disabled={granting}
          startIcon={granting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {granting ? "Granting..." : "Grant Access"}
        </Button>
      }
    >
      <AlertTitle>Pending Vault Access</AlertTitle>
      {label}
    </Alert>
  );
}
