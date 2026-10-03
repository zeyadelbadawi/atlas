/**
 * W8 — gifted setup days (plan admin + display helpers).
 *
 * The range mirrors the backend DTO and the `plans_gifted_days_*_range_chk`
 * database CHECK. These helpers are UX only: the server re-validates every
 * edit and decides every grant.
 */
export const GIFTED_DAYS_MIN = 5;
export const GIFTED_DAYS_MAX = 15;

/** Blank or `0` (no gift), or a whole number of days in 5..15. */
export function isValidGiftedDaysInput(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '0') return true;
  if (!/^\d+$/.test(trimmed)) return false;
  const days = Number(trimmed);
  return days >= GIFTED_DAYS_MIN && days <= GIFTED_DAYS_MAX;
}

/** Draft text → API value. Blank and `0` both mean "no gift" (`null`). */
export function giftedDaysInputToPayload(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '0') return null;
  return Number(trimmed);
}

/** API value → draft text. */
export function giftedDaysToInput(value: number | null | undefined): string {
  return value ? String(value) : '';
}
