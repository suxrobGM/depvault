"use client";

import { useState, type ReactElement } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import { CopyButton } from "./copy-button";

interface MaskedTextFieldProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  label?: string;
  /** When true, the value is hidden until revealed and gets reveal + copy controls. */
  secret?: boolean;
}

/**
 * An editable text field that masks its value when `secret`. Uses `type="password"`
 * (cross-browser safe — Firefox lacks `-webkit-text-security`) so the field stays
 * fully editable while hidden; a per-field eye toggle reveals it and a copy button
 * lifts the value without revealing it. Non-secret values render as a plain field.
 *
 * The editable counterpart of the display-only `MaskedValue` (`data-display`).
 */
export function MaskedTextField(props: MaskedTextFieldProps): ReactElement {
  const { value, onChange, readOnly, label, secret } = props;
  const [revealed, setRevealed] = useState(false);

  const hidden = secret && !revealed;

  return (
    <TextField
      size="small"
      label={label}
      value={value}
      type={hidden ? "password" : "text"}
      disabled={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      sx={{ flex: 1, "& input": { fontFamily: "monospace" } }}
      slotProps={{
        input: secret
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={revealed ? "Hide" : "Reveal"}>
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="Toggle visibility"
                      onClick={() => setRevealed((v) => !v)}
                    >
                      {revealed ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <CopyButton value={value} />
                </InputAdornment>
              ),
            }
          : undefined,
      }}
    />
  );
}
