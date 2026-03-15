"use client";

import type { ReactElement } from "react";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { Alert, Box, Button, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { GlassCard } from "@/components/ui/cards";
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import type { AuthUser } from "@/providers/auth-provider";
import { changeEmailSchema, changePasswordSchema, setPasswordSchema } from "./schemas";

interface SecurityTabProps {
  user: AuthUser;
  setUser: (user: AuthUser | null) => void;
}

export function SecurityTab(props: SecurityTabProps): ReactElement {
  const { user } = props;
  const { logout } = useAuth();
  const confirm = useConfirm();

  const emailMutation = useApiMutation(
    (values: { newEmail: string; password: string }) => client.api.users.me.email.patch(values),
    {
      successMessage: "Email updated. Please verify your new email address.",
      onSuccess: () => emailForm.reset(),
    },
  );

  const passwordMutation = useApiMutation(
    (values: { currentPassword: string; newPassword: string }) =>
      client.api.users.me.password.patch(values),
    {
      successMessage: "Password changed successfully",
      onSuccess: () => passwordForm.reset(),
    },
  );

  const setPasswordMutation = useApiMutation(
    (values: { newPassword: string }) => client.api.users.me.password.patch(values),
    {
      successMessage: "Password set successfully. You can now log in with email and password.",
      onSuccess: () => {
        setPasswordForm.reset();
        props.setUser({ ...user, hasPassword: true });
      },
    },
  );

  const deleteMutation = useApiMutation(() => client.api.users.me.delete(), {
    successMessage: "Account deleted",
    onSuccess: () => logout(),
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

  const setPasswordForm = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    validators: { onSubmit: setPasswordSchema },
    onSubmit: async ({ value }) => {
      await setPasswordMutation.mutateAsync({ newPassword: value.password });
    },
  });

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: "Delete Account",
      description:
        "Are you sure you want to delete your account? This will permanently remove all your projects, analyses, uploads, secret files, and other data.",
      confirmLabel: "Delete my account",
      destructive: true,
      confirmationText: "DELETE",
      confirmationHint: (
        <>
          Type <strong>DELETE</strong> to permanently delete your account.
        </>
      ),
    });
    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  const oauthOnly = !user.hasPassword;

  return (
    <Stack spacing={3}>
      <GlassCard className="vault-fade-up vault-delay-1">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            GitHub Account
          </Typography>
          {user.githubId ? (
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <GitHubIcon />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user.githubUsername ?? "Connected"}
                  </Typography>
                  <Chip label="Linked" size="small" color="success" />
                </Box>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                component="a"
                href={`${API_BASE_URL}/api/auth/github`}
              >
                Relink
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Link your GitHub account to import dependencies from your repositories.
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  startIcon={<GitHubIcon />}
                  component="a"
                  href={`${API_BASE_URL}/api/auth/github`}
                >
                  Link GitHub
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </GlassCard>

      <GlassCard className="vault-fade-up vault-delay-2">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Change Email
          </Typography>
          {oauthOnly ? (
            <Alert severity="info">Set a password first to enable email changes.</Alert>
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
                <FormTextField
                  form={emailForm}
                  name="newEmail"
                  label="New Email"
                  type="email"
                  autoComplete="off"
                />
                <FormTextField
                  form={emailForm}
                  name="password"
                  label="Confirm Password"
                  type="password"
                  autoComplete="off"
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
            {oauthOnly ? "Set Password" : "Change Password"}
          </Typography>
          {oauthOnly ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPasswordForm.handleSubmit();
              }}
            >
              <Stack spacing={2.5}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Your account was created via GitHub. Set a password to also log in with email and
                  password.
                </Alert>
                <FormTextField
                  form={setPasswordForm}
                  name="password"
                  label="Password"
                  type="password"
                />
                <FormTextField
                  form={setPasswordForm}
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={setPasswordMutation.isPending}
                  >
                    {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
                  </Button>
                </Box>
              </Stack>
            </form>
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
          <Button variant="outlined" color="error" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardContent>
      </GlassCard>
    </Stack>
  );
}
