/**
 * Generates a client-side idempotency key for one provisioning-request
 * attempt. The CALLER generates this exactly once (`useState(() => ...)`)
 * and reuses it across retries — the same discipline Prompt 7's
 * `generateIdempotencyKey` established for Checkout. Duplicated here
 * rather than imported across features: it is a one-line wrapper around
 * `crypto.randomUUID()`, and a cross-feature dependency isn't justified
 * for that.
 */
export function generateProvisioningIdempotencyKey(): string {
  return crypto.randomUUID();
}
