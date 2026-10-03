/**
 * Provisioning constants.
 *
 * Configuration values only — never a business rule encoded as a magic
 * number scattered across pages (the same discipline Prompt 6/7 already
 * established for their own constants files).
 */
import type { ProvisioningStepKey } from '@types';

/** Subdomain length bounds. Mirrors Academy's own slug length convention (`MAX_ACADEMY_SLUG_LENGTH`), kept as a local constant since a subdomain and an Academy slug are related-but-distinct concepts (a subdomain is globally unique across all of Atlas; a slug is scoped to its academy record). */
export const MIN_SUBDOMAIN_LENGTH = 3;
export const MAX_SUBDOMAIN_LENGTH = 50;

/** Lowercase letters, numbers, hyphens — the same shape Academy's own slug validation uses. */
export const SUBDOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Subdomains Atlas itself needs, that a customer must never be assigned. */
export const RESERVED_SUBDOMAINS: readonly string[] = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'platform',
  'atlas',
  'mail',
  'status',
  'support',
];

/**
 * How often `useProvisioningRequest` re-checks a non-terminal request's
 * status while its page is open. A UX convenience only, matching Prompt
 * 7's `PAYMENT_STATUS_POLL_INTERVAL_MS` precedent — never a substitute for
 * a real progress-push mechanism a future backend might add.
 *
 * W2 — adaptive: a whole run takes a few seconds, so the first
 * `PROVISIONING_FAST_POLL_WINDOW_MS` after the page starts watching poll
 * every `PROVISIONING_FAST_POLL_INTERVAL_MS` (what the person waits for is
 * real work, not the poll interval); after that, every
 * `PROVISIONING_STATUS_POLL_INTERVAL_MS`. Polling stops at a terminal state.
 */
export const PROVISIONING_STATUS_POLL_INTERVAL_MS = 4000;
export const PROVISIONING_FAST_POLL_INTERVAL_MS = 1000;
export const PROVISIONING_FAST_POLL_WINDOW_MS = 30_000;

/** The interval for a request watched for `elapsedMs` so far. */
export function provisioningPollInterval(elapsedMs: number): number {
  return elapsedMs < PROVISIONING_FAST_POLL_WINDOW_MS
    ? PROVISIONING_FAST_POLL_INTERVAL_MS
    : PROVISIONING_STATUS_POLL_INTERVAL_MS;
}

/** W2 — the stages shown to a person, in order (see `deriveProvisioningStages`). */
export const PROVISIONING_STAGE_KEYS = [
  'academy',
  'website',
  'brand',
  'ready',
] as const;

/** Every provisioning step, in display order. */
export const PROVISIONING_STEP_KEYS: readonly ProvisioningStepKey[] = [
  'tenant',
  'academy',
  'theme',
  'branding',
  'subdomain',
  'domain',
  'finalization',
];
