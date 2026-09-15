/**
 * String helpers.
 *
 * All functions are script-agnostic: they behave correctly for Arabic and Latin
 * text and never assume a single-byte character set.
 */

/**
 * Turns a human-entered title into a slug CANDIDATE.
 *
 * ONE GENERATOR, SHARED. Academy provisioning (`requestedSubdomain`) and
 * Course creation (`slug`) both offer a suggestion derived from the title
 * typed above them, and both must satisfy the same shape rule —
 * `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, which every slug schema in this codebase
 * independently declares. Writing the generator twice is how the two would
 * drift, so it lives here and each caller keeps its OWN authoritative
 * validation (the schemas are unchanged; this only proposes a value they
 * then validate like any typed one).
 *
 * THIS IS NOT A SECOND VALIDATION SYSTEM. It proposes, it never approves:
 * the zod schema still runs, the backend DTO still runs, and uniqueness is
 * still decided by the availability endpoint or the database constraint.
 *
 * NON-LATIN INPUT DELIBERATELY YIELDS `''`, NOT A TRANSLITERATION. A
 * subdomain is a DNS label and a course slug appears in a URL: both are
 * ASCII by definition. Transliterating Arabic would mean inventing a
 * romanization scheme, and a wrong one silently becomes a customer's
 * permanent public address. So "أكاديمية النور" suggests nothing and the
 * field stays empty for the owner to choose — while a mixed title like
 * "أكاديمية ABC" still suggests "abc", because that part genuinely is what
 * they wrote. An empty suggestion is never written into the field, so the
 * user is simply left to type, exactly as before this feature existed.
 *
 * `maxLength` truncates, then re-trims separators so truncation can never
 * leave a trailing hyphen — which would fail the very regex this exists to
 * satisfy.
 */
export function slugifyTitle(title: string, maxLength = 100): string {
  const base = title
    .toLowerCase()
    // Everything outside the allowed alphabet becomes a separator: spaces,
    // punctuation, Arabic letters, emoji. Runs collapse to ONE hyphen, so
    // "ABC   International  Academy" and "ABC — International Academy"
    // both give "abc-international-academy".
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= maxLength) return base;
  return base.slice(0, maxLength).replace(/-+$/g, '');
}

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
/**
 * Turns an API field path (`camelCase`, possibly `dot.joined` for a nested
 * field, e.g. `"address.country"`) into a readable label (`"Country"`) for
 * interpolating into a `validation:*` message when the backend can only
 * ever know the raw field name, never the frontend's translated label for
 * it. Takes the last path segment (the field that actually failed), so a
 * nested violation reads naturally rather than as `"Address.country is
 * required"`.
 */
export function humanizeFieldName(field: string): string {
  const lastSegment = field.split('.').pop() ?? field;
  const spaced = lastSegment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

/**
 * Phase 2 — turns a raw backend `messageKey` (always shaped
 * `errors.<domain>.<specific>`, e.g. `errors.entitlement.limitReached`,
 * `errors.provisioning.stepFailed`) into the key i18next actually needs to
 * resolve it: this app's `errors.json` translation file IS the `errors`
 * namespace (its own keys start at `<domain>.<specific>`, never a
 * redundant leading `errors.` — see that file's own top-level shape), and
 * `i18n.ts` configures `nsSeparator: ':'` — so calling `t()` on the raw
 * dotted string directly (as several call sites did before this fix)
 * resolves it inside the DEFAULT namespace (`common`) instead, where it
 * never exists, and i18next's fallback is to display the literal key
 * string to the user — a real "raw backend error" leak, not a
 * translated message. Only touches strings that actually start with
 * `errors.`; anything else is returned unchanged (never assumed to be a
 * backend messageKey in the first place).
 */
export function toErrorsNamespaceKey(messageKey: string): string {
  return messageKey.startsWith('errors.')
    ? `errors:${messageKey.slice('errors.'.length)}`
    : messageKey;
}
