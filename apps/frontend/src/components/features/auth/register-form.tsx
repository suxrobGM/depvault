"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon, MarkEmailRead as MarkEmailReadIcon } from "@mui/icons-material";
import { Alert, Button, Divider, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { FormTextField } from "@/components/ui/form";
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

          <FormTextField
            form={form}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
          />

          <Stack direction="row" spacing={2}>
            <FormTextField
              form={form}
              name="firstName"
              label="First Name"
              autoComplete="given-name"
            />
            <FormTextField
              form={form}
              name="lastName"
              label="Last Name"
              autoComplete="family-name"
            />
          </Stack>

          <FormTextField
            form={form}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
          />

          <FormTextField
            form={form}
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
          />

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
