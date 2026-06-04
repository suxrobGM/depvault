"use client";

import { useState, type ReactElement } from "react";
import { UserRole } from "@depvault/shared/constants";
import { GitHub as GitHubIcon } from "@mui/icons-material";
import { Alert, Button, Divider, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/api/client";
import { FormTextField } from "@/components/ui/form";
import { API_BASE_URL, ROUTES } from "@/lib/constants";
import { safeRedirect } from "@/utils/url";
import { loginSchema } from "./schemas";

export function LoginForm(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { data, error } = await client.api.auth.login.post(value);
      const role = data?.user?.role;

      if (error) {
        setServerError(error.value.message ?? "Login failed");
        return;
      }

      const redirectTo = safeRedirect(searchParams.get("redirect"));
      if (redirectTo) {
        router.push(redirectTo as Route);
      } else if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
        router.push(ROUTES.admin);
      } else {
        router.push(ROUTES.overview);
      }
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
        <Typography variant="captionMuted">or</Typography>
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

          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
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
