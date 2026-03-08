"use client";

import { useState, type ReactElement } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth";
import { ROUTES } from "@/lib/constants";
import { forgotPasswordSchema } from "./schemas";

export function ForgotPasswordForm(): ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await forgotPasswordAction(value.email);
      if (!result.success) {
        setServerError(result.error ?? "Request failed");
        return;
      }
      setSuccess(true);
    },
  });

  if (success) {
    return (
      <Stack spacing={2} alignItems="center">
        <Alert severity="success" sx={{ width: "100%" }}>
          If an account with that email exists, we've sent a password reset link.
        </Alert>
        <Typography variant="body2">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Typography>
      </Stack>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Stack spacing={2.5}>
        {serverError && <Alert severity="error">{serverError}</Alert>}

        <form.Field
          name="email"
          children={(field) => (
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
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={form.state.isSubmitting}
        >
          {form.state.isSubmitting ? "Sending..." : "Send reset link"}
        </Button>

        <Typography variant="body2" textAlign="center">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Typography>
      </Stack>
    </form>
  );
}
