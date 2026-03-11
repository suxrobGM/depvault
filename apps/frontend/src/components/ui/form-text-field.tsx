"use client";

import type { ReactElement } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import type { AnyFieldApi, ReactFormExtendedApi } from "@tanstack/react-form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReactForm = ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any, any, any>; // prettier-ignore

type FormTextFieldProps = {
  form: AnyReactForm;
  name: string;
} & Omit<TextFieldProps, "value" | "onChange" | "onBlur" | "error" | "helperText" | "name">;

export function FormTextField(props: FormTextFieldProps): ReactElement {
  const { form, name, ...textFieldProps } = props;

  return (
    <form.Field name={name}>
      {(field: AnyFieldApi) => (
        <TextField
          fullWidth
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          error={field.state.meta.errors.length > 0}
          helperText={
            (field.state.meta.errors[0] as { message?: string })?.message ??
            field.state.meta.errors[0]?.toString()
          }
          {...textFieldProps}
        />
      )}
    </form.Field>
  );
}
