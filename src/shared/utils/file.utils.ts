/**
 * File download helpers.
 *
 * Downloads are triggered through a temporary anchor, and object URLs are always
 * revoked so long sessions do not leak memory.
 */

/** Triggers a browser download for an already-available URL. */
export function downloadFromUrl(url: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/** Triggers a browser download for in-memory content. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);

  try {
    downloadFromUrl(objectUrl, fileName);
  } finally {
    // Revoking on the next tick lets the browser start the download first.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

/** Returns the lowercase extension of a file name, without the dot. */
export function fileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) return '';
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

/** Validates a file size against a maximum, expressed in bytes. */
export function isWithinSizeLimit(file: File, maxBytes: number): boolean {
  return file.size <= maxBytes;
}

/**
 * Validates a file against a list of accepted MIME types.
 * An empty list accepts every type.
 */
export function isAcceptedType(
  file: File,
  acceptedMimeTypes: readonly string[]
): boolean {
  if (acceptedMimeTypes.length === 0) return true;
  return acceptedMimeTypes.includes(file.type);
}