/**
 * Reads a `File` as a base64 data URL, wrapped as a Promise.
 *
 * The same `FileReader` pattern every upload in Atlas uses (Course
 * thumbnails, Academy branding, Assignment attachments) — no upload
 * endpoint exists anywhere in the codebase, so files travel as a base64
 * string field in the JSON payload.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
