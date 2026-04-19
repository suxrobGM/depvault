"use client";

import { useState, type ReactElement } from "react";
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Group as GroupIcon,
} from "@mui/icons-material";
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/feedback";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { PendingInvitationListResponse } from "@/types/api/project";

interface InvitationActionProps {
  token: string;
}

export function InvitationAction(props: InvitationActionProps): ReactElement {
  const { token } = props;
  const router = useRouter();
  const [actionTaken, setActionTaken] = useState<"accepted" | "declined" | null>(null);

  const { data, isLoading, error } = useApiQuery<PendingInvitationListResponse>(
    ["invitations", "pending"],
    () => client.api.invitations.pending.get({ query: { page: 1, limit: 50 } }),
  );

  const invitation = data?.items.find((inv) => inv.token === token);

  const acceptMutation = useApiMutation(() => client.api.invitations({ token }).accept.post(), {
    invalidateKeys: [["invitations", "pending"]],
    successMessage: "Invitation accepted",
    onSuccess: () => setActionTaken("accepted"),
  });

  const declineMutation = useApiMutation(() => client.api.invitations({ token }).decline.post(), {
    invalidateKeys: [["invitations", "pending"]],
    successMessage: "Invitation declined",
    onSuccess: () => setActionTaken("declined"),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (actionTaken === "accepted") {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Invitation Accepted
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                mb: 3,
              }}
            >
              You are now a member of the project.
            </Typography>
            <Button variant="contained" onClick={() => router.push(ROUTES.dashboard)}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (actionTaken === "declined") {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", py: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <CloseIcon color="action" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Invitation Declined
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                mb: 3,
              }}
            >
              You have declined the invitation.
            </Typography>
            <Button variant="contained" onClick={() => router.push(ROUTES.dashboard)}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error || !invitation) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", py: 8 }}>
        <Alert severity="error">
          This invitation is no longer valid. It may have expired, been cancelled, or already been
          responded to.
        </Alert>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => router.push(ROUTES.dashboard)}>
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  const inviterName = `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`.trim();
  const isPending = acceptMutation.isPending || declineMutation.isPending;

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", py: 8 }}>
      <Card>
        <CardContent sx={{ py: 4 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <GroupIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h5" gutterBottom>
              Project Invitation
            </Typography>
          </Box>

          <Stack spacing={2} sx={{ mb: 4 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                Project
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                }}
              >
                {invitation.project.name}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                Invited by
              </Typography>
              <Typography variant="body1">{inviterName}</Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                }}
              >
                Role
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label={invitation.role} size="small" variant="outlined" />
              </Box>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => acceptMutation.mutate(undefined)}
              disabled={isPending}
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => declineMutation.mutate(undefined)}
              disabled={isPending}
            >
              {declineMutation.isPending ? "Declining..." : "Decline"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
