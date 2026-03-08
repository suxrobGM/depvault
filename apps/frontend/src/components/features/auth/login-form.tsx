"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { Alert, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { API_BASE_URL, ROUTES } from "@/lib/constants";
import { loginSchema } from "./schemas";

export function LoginForm(): ReactElement {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await loginAction(value.email, value.password);
      if (!result.success) {
        setServerError(result.error ?? "Login failed");
        return;
      }
      router.push(ROUTES.dashboard);
    },
  });

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
        Sign in with GitHub
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

          <form.Field name="password">
            {(field) => (
              <TextField
                label="Password"
                type="password"
                fullWidth
                autoComplete="current-password"
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
            {form.state.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">
              <Link href={ROUTES.forgotPassword} style={{ color: "inherit" }}>
                Forgot password?
              </Link>
            </Typography>
            <Typography variant="body2">
              <Link href={ROUTES.register} style={{ color: "inherit" }}>
                Create account
              </Link>
            </Typography>
          </Stack>
        </Stack>
      </form>
    </Stack>
  );
}
