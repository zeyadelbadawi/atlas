/**
 * Generates a client-side idempotency key for one checkout/payment attempt.
 *
 * The CALLER is responsible for generating this exactly once per attempt
 * and reusing it across retries (e.g. `useState(() => generateIdempotencyKey())`
 * in `CheckoutPage`) — a function that generated a new key on every call
 * would defeat the entire purpose. The backend is the authority on
 * actually enforcing idempotency; this only guarantees the frontend never
 * *invents* a duplicate-looking request out of a retry.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
