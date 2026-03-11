"use client";

import type { ReactElement } from "react";
import { FormHelperText, MenuItem, TextField } from "@mui/material";
import type { AnyFieldApi, ReactFormExtendedApi } from "@tanstack/react-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReactForm = ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any, any, any>; // prettier-ignore

interface FormSelectFieldProps {
  form: AnyReactForm;
  name: string;
  label?: string;
  items: ReadonlyArray<{ value: string; label: string }>;
  /**
   * When true, prepends a "— none —" option with value "".
   * When false (default), the field is disabled with a helper message when items is empty.
   */
  optional?: boolean;
  /** Label for the empty option when optional=true. Defaults to "— none —". */
  emptyLabel?: string;
  /** Helper text shown below the field when optional=false and items is empty. */
  emptyMessage?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function FormSelectField(props: FormSelectFieldProps): ReactElement {
  const {
    form,
    name,
    label,
    items,
    optional = false,
    emptyLabel = "— none —",
    emptyMessage,
    autoFocus,
    disabled = false,
  } = props;

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
            helperText={field.state.meta.errors[0]?.toString()}
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
