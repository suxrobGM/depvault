/** File-format-aware secret detection, layered over the generic `@/utils/detect-secret`. */

import { looksLikeSecret, SECRET_PATTERNS } from "@/utils/detect-secret";
import { parseEnv, type EditorLanguage } from "./file-format";

/** Whether decrypted file text contains at least one value that looks like a secret. */
export function containsDetectedSecret(text: string, language: EditorLanguage): boolean {
  if (!text) return false;

  if (language === "env") {
    return parseEnv(text).some((row) => row.key !== "" && looksLikeSecret(row.value, row.key));
  }

  if (SECRET_PATTERNS.some((re) => re.test(text))) return true;

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^[\s"']*([A-Za-z0-9_.\- ]+?)["']?\s*[:=]\s*(.+?)\s*,?\s*$/);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2];
    if (key === undefined || rawValue === undefined) continue;
    if (looksLikeSecret(rawValue.replace(/^["']|["']$/g, ""), key.trim())) return true;
  }
  return false;
}
