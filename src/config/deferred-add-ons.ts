/**
 * Add-ons whose customer launch is deferred ("Coming Soon").
 *
 * The client mirror of the backend `DEFERRED_ADD_ON_KEYS`
 * (atlas-backend/src/live-sessions/constants/deferred-add-ons.constants.ts),
 * which is the authoritative gate — the backend refuses install / enable /
 * purchase / use for these keys. This copy exists only so the store can
 * present "Coming Soon" and hide purchase actions consistently across every
 * add-ons surface. Keep the two lists in sync; the backend is the boundary.
 */
export const DEFERRED_ADD_ON_KEYS: ReadonlySet<string> = new Set(['live-sessions']);

export function isAddOnComingSoon(addOnKey: string): boolean {
  return DEFERRED_ADD_ON_KEYS.has(addOnKey);
}
