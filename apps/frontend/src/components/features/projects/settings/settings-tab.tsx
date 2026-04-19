"use client";

import { type ReactElement } from "react";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { Box, Button, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/cards";
import { FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useApiQuery } from "@/hooks/use-api-query";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/hooks/use-confirm";
import { client } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { MemberListResponse, ProjectResponse } from "@/types/api/project";
import { updateProjectSchema } from "../schemas";
import { CiTokensSection } from "./ci-tokens-section";

interface SettingsTabProps {
  projectId: string;
}

export function SettingsTab(props: SettingsTabProps): ReactElement {
  const { projectId } = props;
  const router = useRouter();
  const { user } = useAuth();
  const confirm = useConfirm();

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

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Project",
      description: `Are you sure you want to delete ${project?.name}? This will permanently remove all associated data. This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
      confirmationText: project?.name,
    });

    if (confirmed) {
      await deleteMutation.mutateAsync();
    }
  };

  if (!project) {
    return <></>;
  }

  return (
    <Grid container spacing={3} className="vault-fade-up vault-delay-2">
      <Grid size={{ xs: 12 }}>
        <GlassCard>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                mb: 2,
              }}
            >
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
      <Grid size={{ xs: 12 }}>
        <CiTokensSection projectId={projectId} canEdit={canEdit} />
      </Grid>
      {isOwner && (
        <Grid size={{ xs: 12 }}>
          <GlassCard sx={{ borderColor: "error.dark" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "error.main",
                  mb: 1,
                }}
              >
                Danger Zone
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mb: 2,
                }}
              >
                Permanently delete this project and all associated data including analyses,
                environments, and variables. This action cannot be undone.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Delete Project
              </Button>
            </CardContent>
          </GlassCard>
        </Grid>
      )}
    </Grid>
  );
}
