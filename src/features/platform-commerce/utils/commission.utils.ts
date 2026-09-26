/**
 * Basis points ↔ percentage.
 *
 * The backend stores every commission rate as an integer in basis points
 * (1% = 100 bp, 0..10000) — never a float. The Platform Owner thinks and
 * types in percent. This is the ONE seam between the two, so no page
 * multiplies or divides by 100 itself.
 */
export const MAX_BASIS_POINTS = 10_000;
const BASIS_POINTS_PER_PERCENT = 100;

/** `1250` → `12.5` */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / BASIS_POINTS_PER_PERCENT;
}

/**
 * `"12.5"` → `1250`. Rounded to the nearest integer so floating-point noise
 * (`12.34 * 100 = 1233.9999…`) can never produce a non-integer the backend
 * `@IsInt()` would reject.
 */
export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * BASIS_POINTS_PER_PERCENT);
}

/** Locale-aware display, e.g. `12.5%` / `‎12.5‎%` — at most two decimals, matching bp precision. */
export function formatBasisPoints(basisPoints: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(basisPoints / MAX_BASIS_POINTS);
}
