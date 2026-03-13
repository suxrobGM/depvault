"use client";

import { useState, type ReactElement } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { FormSelectField, FormTextField } from "@/components/ui/form";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { client } from "@/lib/api";
import type { PatternResponse } from "@/types/api/secret-scan";

interface CreatePatternDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  editingPattern: PatternResponse | null;
}

const patternSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  regex: z.string().min(1, "Regex is required").max(1024),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
});

const SEVERITY_ITEMS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

export function CreatePatternDialog(props: CreatePatternDialogProps): ReactElement {
  const { open, onClose, projectId, editingPattern } = props;
  const [testInput, setTestInput] = useState("");

  const isEdit = !!editingPattern;

  const createMutation = useApiMutation<PatternResponse, z.infer<typeof patternSchema>>(
    (values) => client.api.projects({ id: projectId })["scan-patterns"].post(values),
    {
      invalidateKeys: [["scan-patterns", projectId]],
      successMessage: "Pattern created",
      onSuccess: () => onClose(),
    },
  );

  const updateMutation = useApiMutation<PatternResponse, z.infer<typeof patternSchema>>(
    (values) =>
      client.api
        .projects({ id: projectId })
        ["scan-patterns"]({ patternId: editingPattern?.id ?? "" })
        .put(values),
    {
      invalidateKeys: [["scan-patterns", projectId]],
      successMessage: "Pattern updated",
      onSuccess: () => onClose(),
    },
  );

  const form = useForm({
    defaultValues: {
      name: editingPattern?.name ?? "",
      regex: editingPattern?.regex ?? "",
      severity: editingPattern?.severity ?? "HIGH",
    },
    validators: { onSubmit: patternSchema },
    onSubmit: async ({ value }) => {
      if (isEdit) {
        await updateMutation.mutateAsync(value);
      } else {
        await createMutation.mutateAsync(value);
      }
    },
  });

  const currentRegex = form.getFieldValue("regex");
  let regexValid = false;
  let testMatches: string[] = [];

  try {
    if (currentRegex) {
      const compiled = new RegExp(currentRegex, "gi");
      regexValid = true;
      if (testInput) {
        testMatches = testInput.match(compiled) ?? [];
      }
    }
  } catch {
    regexValid = false;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <DialogTitle>{isEdit ? "Edit Pattern" : "Add Custom Pattern"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormTextField form={form} name="name" label="Pattern Name" autoFocus />
            <FormTextField
              form={form}
              name="regex"
              label="Regular Expression"
              sx={{ "& input": { fontFamily: "monospace" } }}
            />
            {currentRegex && !regexValid && (
              <Alert severity="error" variant="outlined">
                Invalid regular expression
              </Alert>
            )}
            <FormSelectField form={form} name="severity" label="Severity" items={SEVERITY_ITEMS} />

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.5, display: "block" }}
              >
                Test your pattern
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Paste sample text to test matches..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                sx={{ "& input": { fontFamily: "monospace", fontSize: 13 } }}
              />
              {testInput && regexValid && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  {testMatches.length > 0 ? (
                    testMatches.map((match, i) => (
                      <Chip key={i} label={match} size="small" color="warning" />
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No matches
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
