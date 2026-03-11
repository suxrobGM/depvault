/** Triggers a browser file download from a string, Blob, or ArrayBuffer. */
export function downloadFile(
  content: string | Blob | ArrayBuffer,
  fileName: string,
  type = "text/plain",
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
