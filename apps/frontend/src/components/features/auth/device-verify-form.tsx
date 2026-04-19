"use client";

import { useState, type ReactElement } from "react";
import { CheckCircleOutlined as CheckIcon, Terminal as TerminalIcon } from "@mui/icons-material";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { useSearchParams } from "next/navigation";
import { FormTextField } from "@/components/ui/form";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { deviceVerifySchema } from "./schemas";

export function DeviceVerifyForm(): ReactElement {
  const searchParams = useSearchParams();
  const prefilled = searchParams.get("code") ?? "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: { userCode: prefilled },
    validators: { onSubmit: deviceVerifySchema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const { error } = await client.api.auth.device.verify.post({ userCode: value.userCode });

      if (error) {
        const message = error.value?.message ?? "Verification failed";
        if (
          message.toLowerCase().includes("unauthorized") ||
          message.toLowerCase().includes("token")
        ) {
          setServerError("sign_in_required");
          return;
        }
        setServerError(message);
        return;
      }

      setSuccess(true);
    },
  });

  if (success) {
    return (
      <Stack
        spacing={2}
        sx={{
          alignItems: "center",
          py: 2,
        }}
      >
        <CheckIcon sx={{ fontSize: 48, color: "success.main" }} />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
          }}
        >
          CLI Authorized
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          Your terminal is now authenticated. You can close this tab.
        </Typography>
      </Stack>
    );
  }

  const codeValue = form.state.values.userCode;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TerminalIcon sx={{ color: "text.secondary", fontSize: 20 }} />
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            depvault login
          </Typography>
        </Stack>

        {serverError === "sign_in_required" && (
          <Alert severity="warning">
            You need to sign in first before authorizing the CLI.
            <Typography
              variant="body2"
              component="a"
              href={`${ROUTES.login}?redirect=/cli/verify${codeValue ? `?code=${codeValue}` : ""}`}
              sx={{ display: "block", mt: 0.5, color: "inherit", fontWeight: 600 }}
            >
              Sign in now
            </Typography>
          </Alert>
        )}

        {serverError && serverError !== "sign_in_required" && (
          <Alert severity="error">{serverError}</Alert>
        )}

        <FormTextField
          form={form}
          name="userCode"
          label="Verification Code"
          placeholder="XXXX-XXXX"
          autoFocus
          transform={(v) => {
            const cleaned = v
              .replace(/[^A-Za-z0-9-]/g, "")
              .toUpperCase()
              .slice(0, 9);
            return cleaned.length === 4 && !cleaned.includes("-") ? `${cleaned}-` : cleaned;
          }}
          slotProps={{
            htmlInput: {
              maxLength: 9,
              style: {
                textAlign: "center",
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "0.15em",
                fontFamily: "monospace",
              },
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={form.state.isSubmitting}
        >
          {form.state.isSubmitting ? "Authorizing..." : "Authorize Device"}
        </Button>
      </Stack>
    </form>
  );
}
