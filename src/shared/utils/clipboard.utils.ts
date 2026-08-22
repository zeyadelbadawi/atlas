/**
 * Clipboard access.
 *
 * The asynchronous Clipboard API is unavailable in insecure contexts and older
 * browsers, so a synchronous fallback keeps copy actions working everywhere.
 * Failures are reported by the return value; the caller owns user feedback.
 */

/** Copies text to the clipboard. Returns whether the copy succeeded. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyUsingFallback(text);
    }
  }

  return copyUsingFallback(text);
}

/**
 * Copies via a temporary off-screen textarea.
 *
 * The element is positioned off-screen rather than hidden because hidden
 * elements cannot be selected, which would break the copy command.
 */
function copyUsingFallback(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);

  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}