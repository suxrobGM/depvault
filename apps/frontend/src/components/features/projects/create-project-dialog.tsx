"use client";

import { useState, type ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { client } from "@/api/client";
import { useApiMutation } from "@/api/hooks";
import { queryKeys } from "@/api/query-keys";
import { VaultUnlockDialog } from "@/components/features/vault";
import { FormTextField } from "@/components/ui/form";
import { useVault } from "@/hooks/use-vault";
import { ROUTES } from "@/lib/constants";
import { VaultReauthRequiredError } from "@/lib/crypto";
import { createProjectSchema } from "./schemas";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog(props: CreateProjectDialogProps): ReactElement {
  const { open, onClose } = props;
  const router = useRouter();
  const { isVaultUnlocked, initializeProjectKeys } = useVault();
  const [reauthProjectId, setReauthProjectId] = useState<string | null>(null);

  const goToProject = (id: string) => {
    onClose();
    router.push(ROUTES.project(id) as Route);
  };

  const mutation = useApiMutation(
    (values: { name: string; description?: string; repositoryUrl?: string }) =>
      client.api.projects.post(values),
    {
      invalidateKeys: [queryKeys.projects.list()],
      successMessage: "Project created",
      errorMessage: "Failed to create project",
      onSuccess: async (data) => {
        if (!data) {
          onClose();
          return;
        }
        if (isVaultUnlocked) {
          try {
            await initializeProjectKeys(data.id);
          } catch (err) {
            if (err instanceof VaultReauthRequiredError) {
              // A restored session lacks the recovery key needed for the project's RECOVERY grant.
              // Defer navigation and prompt for the password before finishing key setup.
              setReauthProjectId(data.id);
              return;
            }
            // Other failures are non-blocking; the owner can grant keys later.
          }
        }
        goToProject(data.id);
      },
    },
  );

  const handleReauthUnlocked = async () => {
    const id = reauthProjectId;
    setReauthProjectId(null);
    if (!id) return;
    try {
      await initializeProjectKeys(id);
    } catch {
      // Non-blocking; the owner can grant keys later.
    }
    goToProject(id);
  };

  const handleReauthCancel = () => {
    const id = reauthProjectId;
    setReauthProjectId(null);
    if (id) goToProject(id);
  };

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      repositoryUrl: "",
    },
    validators: { onSubmit: createProjectSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        name: value.name,
        ...(value.description && { description: value.description }),
        ...(value.repositoryUrl && { repositoryUrl: value.repositoryUrl }),
      });
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <>
      <Dialog open={open && reauthProjectId === null} onClose={handleClose} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogTitle>Create Project</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <FormTextField form={form} name="name" label="Project Name" autoFocus />
              <FormTextField
                form={form}
                name="description"
                label="Description"
                multiline
                rows={3}
                placeholder="Optional project description"
              />
              <FormTextField
                form={form}
                name="repositoryUrl"
                label="Repository URL"
                placeholder="https://github.com/org/repo"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <VaultUnlockDialog
        open={reauthProjectId !== null}
        onUnlocked={handleReauthUnlocked}
        onClose={handleReauthCancel}
      />
    </>
  );
}
