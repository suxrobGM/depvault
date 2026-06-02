"use client";

import { type ReactElement } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { FormTextField } from "@/components/ui/form";
import { FileDiffViewerLazy } from "./code-editor-lazy";
import { saveFileSchema } from "./schemas";

interface ReviewChangesDialogProps {
  open: boolean;
  onClose: () => void;
  oldText: string;
  newText: string;
  saving: boolean;
  onConfirm: (message?: string) => Promise<void>;
}

/** Pre-commit "review changes" diff with an optional commit message. */
export function ReviewChangesDialog(props: ReviewChangesDialogProps): ReactElement {
  const { open, onClose, oldText, newText, saving, onConfirm } = props;

  const form = useForm({
    defaultValues: { message: "" },
    validators: { onSubmit: saveFileSchema },
    onSubmit: async ({ value }) => {
      await onConfirm(value.message);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>Review changes</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FileDiffViewerLazy
              oldValue={oldText}
              newValue={newText}
              oldTitle="Current"
              newTitle="Your changes"
            />
            <FormTextField
              form={form}
              name="message"
              label="Commit message"
              placeholder="Describe this change (optional)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : "Save new version"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
