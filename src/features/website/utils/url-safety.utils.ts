/**
 * URL safety (Prompt 11).
 *
 * The single place Atlas decides whether a tenant-authored URL is safe to
 * store and later render as a real `href`/redirect target. Used by every
 * Zod schema and inline form validator that accepts a URL anywhere in the
 * Website feature (CTA external links, footer/social links, custom
 * domain-adjacent fields) — never duplicated per call site.
 *
 * A tenant can type anything into a URL field; this is a genuine
 * untrusted-input boundary (see `Reports/ARCHITECTURE.md`, Prompt 11,
 * "Security Audit" — no `javascript:`/`data:`/`vbscript:`/`file:` URL
 * ever reaches a rendered `href` or a redirect).
 */

/** Schemes a tenant-authored link is allowed to use. Everything else is rejected, including no scheme match at all (a relative-looking string that isn't a real absolute URL). */
const ALLOWED_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'] as const;

/**
 * True when `value` is a syntactically valid absolute URL using one of
 * the allowed schemes. Empty/undefined is treated as "nothing to
 * validate" (the field is optional) — callers that require a value
 * check for emptiness separately.
 */
export function isSafeExternalUrl(value: string | undefined): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return (ALLOWED_URL_SCHEMES as readonly string[]).includes(parsed.protocol);
  } catch {
    return false;
  }
}
