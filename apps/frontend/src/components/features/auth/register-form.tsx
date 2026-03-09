"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon, MarkEmailRead as MarkEmailReadIcon } from "@mui/icons-material";
import { Alert, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { client } from "@/lib/api";
import { API_BASE_URL, ROUTES } from "@/lib/constants";
import { registerSchema } from "./schemas";

export function RegisterForm(): ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const form = useForm({
    defaultValues: { email: "", firstName: "", lastName: "", password: "", confirmPassword: "" },
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await client.api.auth.register.post({
        email: value.email,
        firstName: value.firstName,
        lastName: value.lastName,
        password: value.password,
      });
      if (error) {
        setServerError(error.value.message ?? "Registration failed");
        return;
      }
      setRegistered(true);
    },
  });

  if (registered) {
    return (
      <Stack spacing={2.5} alignItems="center">
        <MarkEmailReadIcon sx={{ fontSize: 48, color: "primary.main" }} />
        <Typography variant="h6" fontWeight={600}>
          Check your email
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          We&apos;ve sent a verification link to your email address. Please verify your email to
          activate your account.
        </Typography>
        <Typography variant="body2">
          <Link href={ROUTES.login} style={{ color: "inherit" }}>
            Go to sign in
          </Link>
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={<GitHubIcon />}
        href={`${API_BASE_URL}/api/auth/github`}
        component="a"
      >
        Sign up with GitHub
      </Button>

      <Divider>
        <Typography variant="caption" color="text.secondary">
          or
        </Typography>
      </Divider>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Stack spacing={2.5}>
          {serverError && <Alert severity="error">{serverError}</Alert>}

          <form.Field name="email">
            {(field) => (
              <TextField
                label="Email"
                type="email"
                fullWidth
                autoComplete="email"
                autoFocus
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.errors.length > 0}
                helperText={field.state.meta.errors[0]?.toString()}
              />
            )}
          </form.Field>

          <Stack direction="row" spacing={2}>
            <form.Field name="firstName">
              {(field) => (
                <TextField
                  label="First Name"
                  fullWidth
                  autoComplete="given-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors.length > 0}
                  helperText={field.state.meta.errors[0]?.toString()}
                />
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field) => (
                <TextField
                  label="Last Name"
                  fullWidth
                  autoComplete="family-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors.length > 0}
                  helperText={field.state.meta.errors[0]?.toString()}
                />
              )}
            </form.Field>
          </Stack>

          <form.Field name="password">
            {(field) => (
              <TextField
                label="Password"
                type="password"
                fullWidth
                autoComplete="new-password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.errors.length > 0}
                helperText={field.state.meta.errors[0]?.toString()}
              />
            )}
          </form.Field>

          <form.Field name="confirmPassword">
            {(field) => (
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                autoComplete="new-password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.errors.length > 0}
                helperText={field.state.meta.errors[0]?.toString()}
              />
            )}
          </form.Field>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={form.state.isSubmitting}
          >
            {form.state.isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          <Typography variant="body2" textAlign="center">
            Already have an account?{" "}
            <Link href={ROUTES.login} style={{ color: "inherit" }}>
              Sign in
            </Link>
          </Typography>
        </Stack>
      </form>
    </Stack>
  );
}
