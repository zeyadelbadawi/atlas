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
 */
export const PROVISIONING_STATUS_POLL_INTERVAL_MS = 4000;

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
