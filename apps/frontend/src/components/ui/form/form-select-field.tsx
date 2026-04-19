"use client";

import type { ReactElement } from "react";
import { FormHelperText, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import type { AnyFieldApi, ReactFormExtendedApi } from "@tanstack/react-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReactForm = ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any, any, any>; // prettier-ignore

interface FormSelectFieldProps {
  form: AnyReactForm;
  name: string;
  label?: string;
  items: ReadonlyArray<{ value: number | string; label: string }>;
  /**
   * `"float"` (default) — floating label inside a `TextField select`.
   * `"above"` — plain text label above a bare `Select`, useful in compact dialogs.
   */
  labelPlacement?: "float" | "above";
  /**
   * When true, prepends a "— none —" option with value "".
   * When false (default), the field is disabled with a helper message when items is empty.
   * Only applies when `labelPlacement="float"`.
   */
  optional?: boolean;
  /** Label for the empty option when optional=true. Defaults to "— none —". */
  emptyLabel?: string;
  /** Helper text shown below the field when optional=false and items is empty. */
  emptyMessage?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * TanStack Form-bound select. Use `labelPlacement="above"` for a compact static label; defaults to a floating MUI `TextField` select with validation display
 */
export function FormSelectField(props: FormSelectFieldProps): ReactElement {
  const {
    form,
    name,
    label,
    items,
    labelPlacement = "float",
    optional = false,
    emptyLabel = "— none —",
    emptyMessage,
    autoFocus,
    disabled = false,
  } = props;

  if (labelPlacement === "above") {
    return (
      <form.Field name={name}>
        {(field: AnyFieldApi) => {
          const isNumeric = typeof field.state.value === "number";
          return (
            <Stack spacing={0.5}>
              {label && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                  }}
                >
                  {label}
                </Typography>
              )}
              <Select
                size="small"
                disabled={disabled}
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(isNumeric ? Number(e.target.value) : e.target.value)
                }
              >
                {items.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          );
        }}
      </form.Field>
    );
  }

  const isEmpty = !optional && items.length === 0;

  return (
    <>
      <form.Field name={name}>
        {(field: AnyFieldApi) => (
          <TextField
            fullWidth
            select
            label={label}
            autoFocus={autoFocus}
            disabled={disabled || isEmpty}
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            error={field.state.meta.errors.length > 0}
            helperText={
              (field.state.meta.errors[0] as { message?: string })?.message ??
              field.state.meta.errors[0]?.toString()
            }
          >
            {optional && (
              <MenuItem value="">
                <em>{emptyLabel}</em>
              </MenuItem>
            )}
            {items.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </form.Field>
      {isEmpty && emptyMessage && <FormHelperText>{emptyMessage}</FormHelperText>}
    </>
  );
}
