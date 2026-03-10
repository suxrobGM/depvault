"use client";

import type { ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormTextField } from "@/components/ui/form-text-field";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useNotification } from "@/hooks/use-notification";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { createProjectSchema } from "./schemas";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog(props: CreateProjectDialogProps): ReactElement {
  const { open, onClose } = props;
  const router = useRouter();
  const notification = useNotification();

  const mutation = useApiMutation(
    (values: { name: string; description?: string; repositoryUrl?: string }) =>
      client.api.projects.post(values),
    {
      invalidateKeys: [["projects"]],
      onSuccess: (data) => {
        notification.success("Project created");
        onClose();
        if (data) {
          router.push(ROUTES.project(data.id) as Route);
        }
      },
      onError: () => {
        notification.error("Failed to create project");
      },
    },
  );

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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { overflowX: "hidden" } } }}
    >
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
  );
}
