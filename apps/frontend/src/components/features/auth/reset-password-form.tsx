"use client";

import { useState, type ReactElement } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth";
import { FormTextField } from "@/components/ui/form-text-field";
import { ROUTES } from "@/lib/constants";
import { resetPasswordSchema } from "./schemas";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm(props: ResetPasswordFormProps): ReactElement {
  const { token } = props;

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const result = await resetPasswordAction(token, value.password);
      if (!result.success) {
        setServerError(result.error ?? "Reset failed");
        return;
      }
      setSuccess(true);
    },
  });

  if (success) {
    return (
      <Stack spacing={2} alignItems="center">
        <Alert severity="success" sx={{ width: "100%" }}>
          Password reset successfully. You can now sign in with your new password.
        </Alert>
        <Typography variant="body2">
          <Link href={ROUTES.login}>Go to sign in</Link>
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

        <FormTextField
          form={form}
          name="password"
          label="New Password"
          type="password"
          autoComplete="new-password"
          autoFocus
        />

        <FormTextField
          form={form}
          name="confirmPassword"
          label="Confirm New Password"
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
          {form.state.isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </Stack>
    </form>
  );
}
