"use client";

import { useState, type ReactElement } from "react";
import { Alert, Box, Button, CardContent, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormTextField } from "@/components/ui/form-text-field";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import type { AuthUser } from "@/providers/auth-provider";
import { changeEmailSchema, changePasswordSchema } from "./schemas";

interface SecurityTabProps {
  user: AuthUser;
  setUser: (user: AuthUser | null) => void;
}

export function SecurityTab(props: SecurityTabProps): ReactElement {
  const { user } = props;
  const { logout } = useAuth();
  const notification = useNotification();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const emailMutation = useApiMutation(
    (values: { newEmail: string; password: string }) => client.api.users.me.email.patch(values),
    {
      onSuccess: () => {
        notification.success("Email updated. Please verify your new email address.");
        emailForm.reset();
      },
      onError: () => {
        notification.error("Failed to update email");
      },
    },
  );

  const passwordMutation = useApiMutation(
    (values: { currentPassword: string; newPassword: string }) =>
      client.api.users.me.password.patch(values),
    {
      onSuccess: () => {
        notification.success("Password changed successfully");
        passwordForm.reset();
      },
      onError: () => {
        notification.error("Failed to change password");
      },
    },
  );

  const deleteMutation = useApiMutation(() => client.api.users.me.delete(), {
    onSuccess: () => {
      notification.success("Account deleted");
      logout();
    },
    onError: () => {
      notification.error("Failed to delete account");
    },
  });

  const emailForm = useForm({
    defaultValues: { newEmail: "", password: "" },
    validators: { onSubmit: changeEmailSchema },
    onSubmit: async ({ value }) => {
      await emailMutation.mutateAsync(value);
    },
  });

  const passwordForm = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value }) => {
      await passwordMutation.mutateAsync({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      });
    },
  });

  const oauthOnly = !user.hasPassword;

  return (
    <Stack spacing={3}>
      <GlassCard className="vault-fade-up vault-delay-2">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Change Email
          </Typography>
          {oauthOnly ? (
            <Alert severity="info">
              Email changes are not available for GitHub-linked accounts without a password.
            </Alert>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                emailForm.handleSubmit();
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Current email
                  </Typography>
                  <Typography variant="body1">{user.email}</Typography>
                </Box>
                <FormTextField form={emailForm} name="newEmail" label="New Email" type="email" />
                <FormTextField
                  form={emailForm}
                  name="password"
                  label="Confirm Password"
                  type="password"
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" variant="contained" disabled={emailMutation.isPending}>
                    {emailMutation.isPending ? "Updating..." : "Update Email"}
                  </Button>
                </Box>
              </Stack>
            </form>
          )}
        </CardContent>
      </GlassCard>

      <GlassCard className="vault-fade-up vault-delay-3">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Change Password
          </Typography>
          {oauthOnly ? (
            <Alert severity="info">
              Password changes are not available for GitHub-linked accounts without a password.
            </Alert>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                passwordForm.handleSubmit();
              }}
            >
              <Stack spacing={2.5}>
                <FormTextField
                  form={passwordForm}
                  name="currentPassword"
                  label="Current Password"
                  type="password"
                />
                <FormTextField
                  form={passwordForm}
                  name="newPassword"
                  label="New Password"
                  type="password"
                />
                <FormTextField
                  form={passwordForm}
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" variant="contained" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </Box>
              </Stack>
            </form>
          )}
        </CardContent>
      </GlassCard>

      <GlassCard glowColor="var(--mui-palette-error-main)" className="vault-fade-up vault-delay-4">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} color="error" sx={{ mb: 1 }}>
            Danger Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Typography>
          <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </GlassCard>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Account"
        description="Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone."
        confirmLabel="Delete my account"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
