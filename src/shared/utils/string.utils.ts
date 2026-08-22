/**
 * String helpers.
 *
 * All functions are script-agnostic: they behave correctly for Arabic and Latin
 * text and never assume a single-byte character set.
 */

/** Collapses runs of whitespace and trims the result. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Truncates text to a maximum length, appending an ellipsis when shortened.
 * Uses `Array.from` so multi-byte characters are never split.
 */
export function truncate(value: string, maxLength: number): string {
  const characters = Array.from(value);
  if (characters.length <= maxLength) return value;
  return `${characters.slice(0, Math.max(0, maxLength - 1)).join('')}…`;
}

/**
 * Builds up-to-two-character initials for an avatar fallback.
 * Works for Arabic and Latin names alike.
 */
export function initialsFromName(name: string): string {
  const words = normalizeWhitespace(name)
    .split(' ')
    .filter((word) => word.length > 0);

  if (words.length === 0) return '';

  const firstInitial = Array.from(words[0])[0] ?? '';
  if (words.length === 1) return firstInitial.toUpperCase();

  const lastInitial = Array.from(words[words.length - 1])[0] ?? '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}

/** Returns true when a string contains no non-whitespace characters. */
export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim().length === 0;
}