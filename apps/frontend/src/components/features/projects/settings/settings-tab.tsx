"use client";

import { useState, type ReactElement } from "react";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormTextField } from "@/components/ui/form-text-field";
import { GlassCard } from "@/components/ui/glass-card";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { updateProjectSchema } from "../schemas";

interface SettingsTabProps {
  projectId: string;
}

export function SettingsTab(props: SettingsTabProps): ReactElement {
  const { projectId } = props;
  const router = useRouter();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: project } = useApiQuery<ProjectResponse>(["projects", projectId], () =>
    client.api.projects({ id: projectId }).get(),
  );

  const { data: membersData } = useApiQuery<MemberListResponse>(
    ["projects", projectId, "members"],
    () => client.api.projects({ id: projectId }).members.get({ query: { page: 1, limit: 50 } }),
  );

  const currentMember = membersData?.items.find((m) => m.user.id === user?.id);
  const isOwner = currentMember?.role === "OWNER";
  const canEdit = isOwner || currentMember?.role === "EDITOR";

  const updateMutation = useApiMutation(
    (values: { name: string; description?: string; repositoryUrl?: string }) =>
      client.api.projects({ id: projectId }).put(values),
    {
      invalidateKeys: [["projects", projectId], ["projects"]],
      successMessage: "Project updated",
    },
  );

  const deleteMutation = useApiMutation(() => client.api.projects({ id: projectId }).delete(), {
    invalidateKeys: [["projects"]],
    successMessage: "Project deleted",
    onSuccess: () => router.push(ROUTES.projects as Route),
  });

  const form = useForm({
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      repositoryUrl: project?.repositoryUrl ?? "",
    },
    validators: { onSubmit: updateProjectSchema },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        name: value.name,
        ...(value.description !== undefined && { description: value.description || undefined }),
        ...(value.repositoryUrl !== undefined && {
          repositoryUrl: value.repositoryUrl || undefined,
        }),
      });
    },
  });

  if (!project) {
    return <></>;
  }

  return (
    <Grid container spacing={3} className="vault-fade-up vault-delay-2">
      <Grid size={{ xs: 12 }}>
        <GlassCard>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Project Settings
            </Typography>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <Stack spacing={2.5}>
                <FormTextField form={form} name="name" label="Project Name" disabled={!canEdit} />
                <FormTextField
                  form={form}
                  name="description"
                  label="Description"
                  multiline
                  rows={3}
                  disabled={!canEdit}
                />
                <FormTextField
                  form={form}
                  name="repositoryUrl"
                  label="Repository URL"
                  placeholder="https://github.com/org/repo"
                  disabled={!canEdit}
                />
                {canEdit && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </Box>
                )}
              </Stack>
            </form>
          </CardContent>
        </GlassCard>
      </Grid>

      {isOwner && (
        <Grid size={{ xs: 12 }}>
          <GlassCard sx={{ borderColor: "error.dark" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} color="error.main" sx={{ mb: 1 }}>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Permanently delete this project and all associated data including analyses,
                environments, and variables. This action cannot be undone.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete Project
              </Button>
            </CardContent>
          </GlassCard>

          <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete <strong>{project.name}</strong>? This will
                permanently remove all associated data. This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                color="error"
                variant="contained"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
      )}
    </Grid>
  );
}
