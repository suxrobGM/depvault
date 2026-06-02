"use client";

import { decrypt } from "@depvault/crypto";
import { useEffect, useState } from "react";
import { useVault } from "@/hooks/use-vault";

interface EncryptedBlob {
  encryptedContent: string;
  iv: string;
  authTag: string;
  isBinary: boolean;
}

interface DecryptedTextState {
  text: string | null;
  isDecrypting: boolean;
  error: string | null;
}

/**
 * Decrypts a fetched config/secret blob to UTF-8 text once it loads.
 *
 * Binary blobs are never decrypted to text (callers show a placeholder). Follows
 * the project pattern: state is only set inside the async `.then`/`catch`, guarded
 * by a cancellation flag so a stale fetch can't overwrite newer state.
 */
export function useDecryptedText(
  projectId: string,
  blob: EncryptedBlob | undefined,
): DecryptedTextState {
  const { getProjectDEK } = useVault();
  const [text, setText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = blob?.encryptedContent;

  useEffect(() => {
    if (!blob || blob.isBinary) {
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);
    setError(null);

    getProjectDEK(projectId)
      .then((dek) => decrypt(blob.encryptedContent, blob.iv, blob.authTag, dek))
      .then((plaintext) => {
        if (cancelled) return;
        setText(plaintext);
        setIsDecrypting(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to decrypt file");
        setIsDecrypting(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run keyed on the blob ciphertext + project
  }, [projectId, id]);

  return { text, isDecrypting, error };
}
