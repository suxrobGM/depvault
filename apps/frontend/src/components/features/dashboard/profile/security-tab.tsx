"use client";

import type { ReactElement } from "react";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { VaultSecurityPanel } from "@/components/features/vault";
import { Surface } from "@/components/ui/cards";
import { LoadingSpinner } from "@/components/ui/feedback";
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { changeEmailSchema, changePasswordSchema, setPasswordSchema } from "./schemas";

export function SecurityTab(): ReactElement {
  const { user, setUser, logout } = useAuth();
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
        if (user) {
          setUser({ ...user, hasPassword: true });
        }
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

  if (!user) {
    return <LoadingSpinner />;
  }

  const oauthOnly = !user.hasPassword;

  return (
    <Stack spacing={3}>
      <Surface className="vault-fade-up vault-delay-1">
        <CardHeader title="GitHub Account" />
        <CardContent sx={{ p: 3 }}>
          {user.githubId ? (
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                }}
              >
                <GitHubIcon />
                <Box>
                  <Typography variant="label">{user.githubUsername ?? "Connected"}</Typography>
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
              <Typography variant="body2Muted">
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
      </Surface>
      <Surface className="vault-fade-up vault-delay-2">
        <CardHeader title="Change Email" />
        {oauthOnly ? (
          <CardContent sx={{ p: 3 }}>
            <Alert severity="info">Set a password first to enable email changes.</Alert>
          </CardContent>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              emailForm.handleSubmit();
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2Muted" sx={{ mb: 1 }}>
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
              </Stack>
            </CardContent>
            <CardActions>
              <Button type="submit" variant="contained" disabled={emailMutation.isPending}>
                {emailMutation.isPending ? "Updating..." : "Update Email"}
              </Button>
            </CardActions>
          </form>
        )}
      </Surface>
      <Surface className="vault-fade-up vault-delay-3">
        <CardHeader title={oauthOnly ? "Set Password" : "Change Password"} />
        {oauthOnly ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordForm.handleSubmit();
            }}
          >
            <CardContent sx={{ p: 3 }}>
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
              </Stack>
            </CardContent>
            <CardActions>
              <Button type="submit" variant="contained" disabled={setPasswordMutation.isPending}>
                {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
              </Button>
            </CardActions>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              passwordForm.handleSubmit();
            }}
          >
            <CardContent sx={{ p: 3 }}>
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
              </Stack>
            </CardContent>
            <CardActions>
              <Button type="submit" variant="contained" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </CardActions>
          </form>
        )}
      </Surface>
      <VaultSecurityPanel />
      <Surface className="vault-fade-up vault-delay-5" accent="error">
        <CardHeader title="Danger Zone" slotProps={{ title: { sx: { color: "error.main" } } }} />
        <CardContent sx={{ p: 3 }}>
          <Typography variant="body2Muted">
            Permanently delete your account and all associated data. This action cannot be undone.
          </Typography>
        </CardContent>
        <CardActions>
          <Button variant="outlined" color="error" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </CardActions>
      </Surface>
    </Stack>
  );
}
