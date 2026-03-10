"use client";

import { useState, type ReactElement } from "react";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { Alert, Button, Divider, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormTextField } from "@/components/ui/form-text-field";
import { client } from "@/lib/api";
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
      const { error } = await client.api.auth.login.post(value);
      if (error) {
        setServerError(error.value.message ?? "Login failed");
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

          <FormTextField
            form={form}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
          />

          <FormTextField
            form={form}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />

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
