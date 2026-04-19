"use client";

import { useState, type ReactElement } from "react";
import { SubscriptionPlanName } from "@depvault/shared/constants";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { SelectField } from "@/components/ui/inputs";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { client } from "@/lib/api";
import type { AdminUserDetailResponse, CompSubscriptionBody } from "@/types/api";

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export function UserDetailDialog(props: UserDetailDialogProps): ReactElement {
  const { open, onClose, userId } = props;
  const [compPlan, setCompPlan] = useState<CompSubscriptionBody["plan"]>("PRO");

  const { data: user, isLoading } = useApiQuery<AdminUserDetailResponse>(
    ["admin-user-detail", userId],
    () => client.api.admin.users({ id: userId! }).get(),
    { enabled: open && userId !== null, errorMessage: "Failed to load user details" },
  );

  const assignMutation = useApiMutation<{ message: string }, CompSubscriptionBody>(
    (variables) => client.api.admin.users({ id: userId! }).subscription.patch(variables),
    {
      invalidateKeys: [["admin-user-detail", userId], ["admin-users"], ["admin-stats"]],
      successMessage: "Subscription assigned successfully",
      errorMessage: "Failed to assign subscription",
    },
  );

  const revokeMutation = useApiMutation<{ message: string }>(
    () => client.api.admin.users({ id: userId! }).subscription.delete(),
    {
      invalidateKeys: [["admin-user-detail", userId], ["admin-users"], ["admin-stats"]],
      successMessage: "Subscription revoked successfully",
      errorMessage: "Failed to revoke subscription",
    },
  );

  const handleAssign = () => {
    assignMutation.mutate({ plan: compPlan });
  };

  const handleRevoke = () => {
    revokeMutation.mutate();
  };

  const fullName = user
    ? ([user.firstName, user.lastName].filter(Boolean).join(" ") ?? "No name")
    : "";

  const sub = user?.subscription;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>User Details</DialogTitle>
      <DialogContent dividers>
        {isLoading || !user ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                }}
              >
                {fullName}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                }}
              >
                {user.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={user.role} size="small" color="primary" variant="outlined" />
                <Chip
                  label={sub?.plan ?? SubscriptionPlanName.FREE}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={sub?.status ?? "—"}
                  size="small"
                  color={sub?.status === "ACTIVE" ? "success" : "default"}
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Usage
              </Typography>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {user.usage.projects}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Projects
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {user.usage.analyses}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Analyses
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {user.usage.secretFiles}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    Secret Files
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {sub && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  Current Subscription
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <Chip label={sub.plan} size="small" color="primary" />
                  <Chip
                    label={sub.status}
                    size="small"
                    color={sub.status === "ACTIVE" ? "success" : "default"}
                  />
                  {sub.isComp && (
                    <Chip label="Comp" size="small" color="warning" variant="outlined" />
                  )}
                </Stack>
                {sub.currentPeriodEnd && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      mt: 0.5,
                      display: "block",
                    }}
                  >
                    Period ends: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            )}

            <Divider />

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                Comp Subscription
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                }}
              >
                <SelectField
                  value={compPlan}
                  onChange={(v) => setCompPlan(v as CompSubscriptionBody["plan"])}
                  options={[
                    { value: SubscriptionPlanName.PRO, label: "Pro" },
                    { value: SubscriptionPlanName.TEAM, label: "Team" },
                  ]}
                  minWidth={120}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAssign}
                  disabled={assignMutation.isPending}
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
                {sub?.isComp && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleRevoke}
                    disabled={revokeMutation.isPending}
                  >
                    {revokeMutation.isPending ? "Revoking..." : "Revoke"}
                  </Button>
                )}
              </Stack>
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Account created: {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
