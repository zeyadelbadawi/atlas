/**
 * The shared analytics date range, held in the URL (P59).
 *
 * WHY THE URL AND NOT COMPONENT STATE. The four Analysis areas are now
 * separate routes, so a `useState` preset would reset every time the
 * operator moved between Overview and Revenue — the range would silently
 * snap back to 30 days mid-investigation. Putting it in the query string
 * makes it survive navigation AND makes a filtered view shareable, neither
 * of which the previous tab-local state could do.
 *
 * `30d` is the default, matching the value the tabbed page used, and an
 * unrecognised `?range=` falls back to it rather than erroring — a URL is
 * user-editable input.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { computeDateRange } from '../utils/analytics-date-range.utils';
import type { AnalyticsDateRangePreset } from '../utils/analytics-date-range.utils';

const VALID: readonly AnalyticsDateRangePreset[] = ['7d', '30d', '90d'];
const DEFAULT_PRESET: AnalyticsDateRangePreset = '30d';

export interface UseAnalyticsRangeResult {
  readonly preset: AnalyticsDateRangePreset;
  readonly setPreset: (next: AnalyticsDateRangePreset) => void;
  readonly query: { readonly dateRange: ReturnType<typeof computeDateRange> };
}

export function useAnalyticsRange(): UseAnalyticsRangeResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get('range');
  const preset: AnalyticsDateRangePreset = VALID.includes(
    raw as AnalyticsDateRangePreset
  )
    ? (raw as AnalyticsDateRangePreset)
    : DEFAULT_PRESET;

  const dateRange = useMemo(() => computeDateRange(preset), [preset]);
  const query = useMemo(() => ({ dateRange }), [dateRange]);

  const setPreset = (next: AnalyticsDateRangePreset): void => {
    const params = new URLSearchParams(searchParams);
    params.set('range', next);
    // `replace` so changing the range does not stack history entries the
    // back button then has to walk through.
    setSearchParams(params, { replace: true });
  };

  return { preset, setPreset, query };
}
