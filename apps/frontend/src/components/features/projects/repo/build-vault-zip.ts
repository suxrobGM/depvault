import { decryptBinary, decrypt as decryptText } from "@depvault/crypto";
import { zip, type Zippable } from "fflate";
import { client } from "@/lib/api";
import type { RepoMapFileDto } from "@/types/api/repo";

/**
 * Fetches every repo file's encrypted blob, decrypts it client-side with the
 * project DEK, and bundles all files into a single zip keyed by their
 * `relativePath` (unique per project, so paths nest correctly with no
 * collisions). The server never sees plaintext — decryption happens here.
 * Returns the zip bytes as a tightly-packed `ArrayBuffer` ready for download
 * or the share-link flow.
 */
export async function buildVaultZip(
  projectId: string,
  files: RepoMapFileDto[],
  getProjectDEK: (projectId: string) => Promise<CryptoKey>,
): Promise<ArrayBuffer> {
  const dek = await getProjectDEK(projectId);

  const entries = await Promise.all(
    files.map(async (file): Promise<[string, Uint8Array]> => {
      const { data } = await client.api
        .projects({ id: projectId })
        .files({ fileId: file.id })
        .get();
      if (!data) {
        throw new Error(`Failed to fetch "${file.relativePath}"`);
      }

      if (file.isBinary) {
        const buffer = await decryptBinary(data.encryptedContent, data.iv, data.authTag, dek);
        return [file.relativePath, new Uint8Array(buffer)];
      }

      const text = await decryptText(data.encryptedContent, data.iv, data.authTag, dek);
      return [file.relativePath, new TextEncoder().encode(text)];
    }),
  );

  const zippable: Zippable = Object.fromEntries(entries);

  return new Promise<ArrayBuffer>((resolve, reject) => {
    zip(zippable, (err, data) => {
      if (err) reject(err);
      // Copy into a fresh, tightly-packed ArrayBuffer (fflate's view may be backed
      // by a larger/typed buffer; this also narrows the type away from SharedArrayBuffer).
      else resolve(new Uint8Array(data).buffer);
    });
  });
}
