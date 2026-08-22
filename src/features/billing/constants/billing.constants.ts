/**
 * Billing & Payment constants.
 *
 * Configuration values only — never a business rule encoded as a magic
 * number scattered across pages (the same discipline `tenant.constants.ts`,
 * Prompt 6, established for trial/grace-period duration).
 */

/** Payment proof maximum file size (10MB — larger than the 5MB image-only Course thumbnail limit, since proof also accepts PDF bank receipts). */
export const MAX_PAYMENT_PROOF_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed payment proof file types. */
export const ALLOWED_PAYMENT_PROOF_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
];

/**
 * How often `usePaymentDetails` re-checks a non-terminal Payment's status
 * while its page is open. A UX convenience only — see acceptance criteria
 * C-7-83: this is NOT a substitute for webhooks, never runs once a
 * terminal status is reached, and never runs for a manual-review payment
 * awaiting proof (nothing external is happening yet to poll for).
 */
export const PAYMENT_STATUS_POLL_INTERVAL_MS = 5000;

/** Payment review rejection notes: minimum length, so a reviewer must give the tenant an actionable reason. */
export const MIN_PAYMENT_REJECTION_NOTES_LENGTH = 10;
export const MAX_PAYMENT_REVIEW_NOTES_LENGTH = 1000;
export const MAX_PAYMENT_PROOF_NOTE_LENGTH = 500;
