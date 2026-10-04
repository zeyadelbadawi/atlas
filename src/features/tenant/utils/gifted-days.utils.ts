/**
 * W8 — the gift a plan offers on a FIRST paid subscription, per billing
 * cycle. Display only: whether a customer actually receives it is decided by
 * the backend at payment approval.
 *
 * The helper itself lives in `@utils` (`plan-gifted-days.utils.ts`) so the
 * public marketing pricing pages read the catalog the same way; re-exported
 * here so the tenant feature's existing imports keep working.
 */
export { planGiftedDaysFor } from '@utils';
