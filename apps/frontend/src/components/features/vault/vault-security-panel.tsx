"use client";

import { useState, type ReactElement } from "react";
import { Lock as LockIcon } from "@mui/icons-material";
import { Alert, Box, Button, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { GlassCard } from "@/components/ui/cards";
import { FormTextField } from "@/components/ui/form";
import { useVault } from "@/hooks/use-vault";
import { vaultChangePasswordSchema } from "./schema";
import { VaultRegenerateRecoveryDialog } from "./vault-regenerate-recovery-dialog";

/** Combined vault security panel: change vault password + regenerate recovery key. */
export function VaultSecurityPanel(): ReactElement {
  const { vaultStatus, changeVaultPassword } = useVault();
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validators: { onSubmit: vaultChangePasswordSchema },
    onSubmit: async ({ value }) => {
      setPasswordError(null);
      setPasswordSuccess(false);
      try {
        await changeVaultPassword(value.currentPassword, value.newPassword);
        setPasswordSuccess(true);
        form.reset();
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : "Failed to change vault password");
      }
    },
  });

  if (vaultStatus === "no-vault") {
    return (
      <GlassCard className="vault-fade-up vault-delay-4">
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <LockIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              Encryption Vault
            </Typography>
          </Stack>
          <Alert severity="info">
            Set up your vault from a project&apos;s vault page to enable end-to-end encryption.
          </Alert>
        </CardContent>
      </GlassCard>
    );
  }

  if (vaultStatus !== "unlocked") {
    return (
      <GlassCard className="vault-fade-up vault-delay-4">
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <LockIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              Encryption Vault
            </Typography>
            <Chip label="Locked" size="small" color="warning" />
          </Stack>
          <Alert severity="info">
            Unlock your vault from a project&apos;s vault page to manage vault settings.
          </Alert>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="vault-fade-up vault-delay-4">
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
            <LockIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>
              Encryption Vault
            </Typography>
            <Chip label="Unlocked" size="small" color="success" />
          </Stack>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <Stack spacing={2.5}>
              <Typography variant="body2" fontWeight={600}>
                Change Vault Password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your vault password is separate from your login password and never sent to the
                server.
              </Typography>

              <FormTextField
                form={form}
                name="currentPassword"
                label="Current Vault Password"
                type="password"
              />
              <FormTextField
                form={form}
                name="newPassword"
                label="New Vault Password"
                type="password"
              />
              <FormTextField
                form={form}
                name="confirmPassword"
                label="Confirm New Vault Password"
                type="password"
              />

              {passwordError && <Alert severity="error">{passwordError}</Alert>}
              {passwordSuccess && (
                <Alert severity="success">Vault password changed successfully.</Alert>
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="submit" variant="contained" disabled={form.state.isSubmitting}>
                  {form.state.isSubmitting ? "Changing..." : "Change Vault Password"}
                </Button>
              </Box>
            </Stack>
          </form>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="body2" fontWeight={600}>
              Recovery Key
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate a new recovery key if you suspect your current one has been compromised. This
              will invalidate the previous key.
            </Typography>
            <Box>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setShowRegenerateDialog(true)}
              >
                Regenerate Recovery Key
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </GlassCard>

      <VaultRegenerateRecoveryDialog
        open={showRegenerateDialog}
        onClose={() => setShowRegenerateDialog(false)}
      />
    </>
  );
}
