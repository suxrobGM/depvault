"use client";

import { useState, type ReactElement } from "react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, Stack, Typography } from "@mui/material";
import { useVault } from "@/hooks/use-vault";
import { decrypt } from "@/lib/crypto";

interface EncryptedValueProps {
  projectId: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
}

/** Decrypts a value on-demand when the user clicks the reveal toggle. */
export function EncryptedValue(props: EncryptedValueProps): ReactElement {
  const { projectId, encryptedValue, iv, authTag } = props;

  if (encryptedValue === "") {
    return <BlankValue />;
  }

  return (
    <RevealableValue
      projectId={projectId}
      encryptedValue={encryptedValue}
      iv={iv}
      authTag={authTag}
    />
  );
}

function BlankValue(): ReactElement {
  return (
    <Typography
      variant="body2"
      sx={{ fontFamily: "monospace", color: "text.secondary", fontStyle: "italic" }}
    >
      (empty)
    </Typography>
  );
}

function RevealableValue(props: EncryptedValueProps): ReactElement {
  const { projectId, encryptedValue, iv, authTag } = props;
  const { getProjectDEK } = useVault();
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);

  const handleToggle = async () => {
    if (visible) {
      setVisible(false);
      return;
    }

    if (decrypted !== null) {
      setVisible(true);
      return;
    }

    try {
      const dek = await getProjectDEK(projectId);
      const plaintext = await decrypt(encryptedValue, iv, authTag, dek);
      setDecrypted(plaintext);
      setVisible(true);
    } catch {
      setError(true);
    }
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Typography
        variant="body2"
        color={error ? "error" : undefined}
        sx={{ fontFamily: "monospace", userSelect: visible ? "text" : "none" }}
      >
        {error ? "Decryption failed" : visible ? decrypted : "•".repeat(12)}
      </Typography>
      {!error && (
        <IconButton size="small" onClick={handleToggle} aria-label="Toggle visibility">
          {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
        </IconButton>
      )}
    </Stack>
  );
}
