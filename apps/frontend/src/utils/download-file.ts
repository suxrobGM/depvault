/**
 * Utility function to trigger a file download in the browser.
 * @param content The content of the file to download.
 * @param fileName The name of the file to be downloaded, including extension.
 * @param type The MIME type of the file. Defaults to "text/plain".
 */
export function downloadFile(content: string | Blob, fileName: string, type = "text/plain"): void {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
    type = content.type || type;
  } else {
    blob = new Blob([content], { type });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
