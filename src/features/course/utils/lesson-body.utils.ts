/**
 * B0-LRN-01 — plain text to minimal paragraphs, for opening an older text
 * lesson whose body was saved in its description (before the builder had
 * a body field). Escapes everything, so the result contains only the
 * `<p>`/`<br>` this function writes. Mirrors the server's
 * `plainTextToHtml`, which delivers the same lessons to learners.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToLessonHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
    )
    .join('');
}
