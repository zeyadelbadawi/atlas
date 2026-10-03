/**
 * Audit log filter state and its translation into feed query parameters.
 *
 * Dates are `<input type="date">` values (yyyy-mm-dd) interpreted in the
 * viewer's own time zone — "from 3 Oct" means from the start of the 3rd
 * where the viewer is, which is what a person filtering by day expects.
 */
import type { AuditCategory, AuditFeedQuery } from '@types';

export interface AuditFilterRef {
  readonly id: string;
  readonly name: string;
}

export interface AuditFilterState {
  readonly category?: AuditCategory;
  /** yyyy-mm-dd */
  readonly from?: string;
  /** yyyy-mm-dd */
  readonly to?: string;
  readonly search: string;
  readonly actor?: AuditFilterRef;
  readonly academy?: AuditFilterRef;
}

export const EMPTY_AUDIT_FILTERS: AuditFilterState = { search: '' };

/** Inclusive local-day bounds → ISO instants the API filters on. */
export function toAuditFeedFilters(
  state: AuditFilterState,
  search: string
): Omit<AuditFeedQuery, 'cursor' | 'limit'> & { academyId?: string } {
  const startOfDay = (day: string): string =>
    new Date(`${day}T00:00:00`).toISOString();
  const endOfDay = (day: string): string =>
    new Date(`${day}T23:59:59.999`).toISOString();
  return {
    ...(state.category ? { category: state.category } : {}),
    ...(state.from ? { occurredFrom: startOfDay(state.from) } : {}),
    ...(state.to ? { occurredTo: endOfDay(state.to) } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(state.actor ? { actorUserId: state.actor.id } : {}),
    ...(state.academy ? { academyId: state.academy.id } : {}),
  };
}

export function hasActiveAuditFilters(state: AuditFilterState): boolean {
  return Boolean(
    state.category ||
    state.from ||
    state.to ||
    state.search.trim() ||
    state.actor ||
    state.academy
  );
}
