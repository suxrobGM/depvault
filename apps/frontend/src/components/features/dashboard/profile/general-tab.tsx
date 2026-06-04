"use client";

import type { ReactElement } from "react";
import {
  Box,
  Button,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { client } from "@/api/client";
import { useApiMutation } from "@/api/hooks";
import { useAuth } from "@/auth/use-auth";
import { Surface } from "@/components/ui/cards";
import { LoadingSpinner } from "@/components/ui/feedback";
import { FormTextField } from "@/components/ui/form";
import { AvatarUploader } from "./avatar-uploader";
import { updateProfileSchema } from "./schemas";

export function GeneralTab(): ReactElement {
  const { user, setUser } = useAuth();

  const updateMutation = useApiMutation(
    (values: { firstName: string; lastName: string }) => client.api.users.me.patch(values),
    {
      successMessage: "Profile updated",
      onSuccess: (data) => {
        if (data && user) {
          setUser({ ...user, firstName: data.firstName, lastName: data.lastName });
        }
      },
    },
  );

  const form = useForm({
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
    validators: { onSubmit: updateProfileSchema },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value);
    },
  });

  if (!user) {
    return <LoadingSpinner />;
  }

  const handleAvatarChange = (avatarUrl: string) => {
    setUser({ ...user, avatarUrl });
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Surface sx={{ height: "100%" }} className="vault-fade-up vault-delay-2">
          <CardHeader title="Avatar" />
          <CardContent sx={{ p: 3 }}>
            <AvatarUploader currentAvatarUrl={user.avatarUrl} onAvatarChange={handleAvatarChange} />
          </CardContent>
        </Surface>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Surface className="vault-fade-up vault-delay-3">
          <CardHeader title="Personal Information" />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2.5}>
                <FormTextField form={form} name="firstName" label="First Name" />
                <FormTextField form={form} name="lastName" label="Last Name" />
                <Box>
                  <Typography variant="body2Muted" sx={{ mb: 1 }}>
                    Email
                  </Typography>
                  <Typography variant="body1">{user.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2Muted" sx={{ mb: 1 }}>
                    Role
                  </Typography>
                  <Typography variant="body1">{user.role}</Typography>
                </Box>
              </Stack>
            </CardContent>
            <CardActions>
              <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardActions>
          </form>
        </Surface>
      </Grid>
    </Grid>
  );
}
