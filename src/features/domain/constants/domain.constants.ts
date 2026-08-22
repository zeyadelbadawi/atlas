/**
 * Domain constants (Prompt 11).
 */
import { ENV } from '@config';
import type { PlatformDomainConfiguration } from '@types';

/**
 * A standard, RFC-1035-shaped hostname: labels of 1–63 alphanumeric/
 * hyphen characters (never starting/ending with a hyphen), at least one
 * dot. Deliberately excludes a scheme/path/port — a custom domain field
 * accepts a bare hostname only, never a full URL (the "Link / Redirect"
 * URL-safety rules are a separate, unrelated concern — see
 * `url-safety.utils.ts`).
 */
export const HOSTNAME_REGEX =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export const MAX_HOSTNAME_LENGTH = 253;
export const MIN_HOSTNAME_LENGTH = 4;

/**
 * The compiled bootstrap default for the platform base-domain query's
 * `initialData` — see `usePlatformDomainConfiguration`'s doc comment for
 * why this exists at all (the same "compiled default, superseded by
 * backend truth" idiom Prompt 6 established for `DEFAULT_TRIAL_POLICY`).
 * `configured` is derived from whether a real `VITE_PLATFORM_BASE_DOMAIN`
 * was compiled in — never hardcoded `true`.
 */
export const DEFAULT_PLATFORM_DOMAIN_CONFIGURATION: PlatformDomainConfiguration = Object.freeze({
  baseDomain: ENV.platformBaseDomain,
  configured: Boolean(ENV.platformBaseDomain),
});
