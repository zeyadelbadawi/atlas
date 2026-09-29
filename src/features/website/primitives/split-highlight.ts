/**
 * Splits a heading around the first occurrence of its highlight phrase
 * (`Heading`). `null` when there's nothing to highlight — including a phrase
 * the Owner's edited title no longer contains.
 */
export function splitHighlight(
  text: string,
  highlight: string | undefined
): readonly [string, string, string] | null {
  const phrase = highlight?.trim();
  if (!phrase) return null;
  const index = text.indexOf(phrase);
  if (index < 0) return null;
  return [
    text.slice(0, index),
    phrase,
    text.slice(index + phrase.length),
  ] as const;
}
