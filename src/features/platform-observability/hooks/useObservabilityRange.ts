/**
 * The selected time window, held in the URL (`?range=`), so a filtered view
 * survives reloads and can be shared. An unrecognised value falls back to
 * the default rather than erroring — a URL is user-editable input.
 */
import { useSearchParams } from 'react-router-dom';
import type { MetricRange } from '@types';

export const METRIC_RANGES: readonly MetricRange[] = [
  '1h',
  '6h',
  '24h',
  '7d',
  '30d',
];

export const DEFAULT_RANGE: MetricRange = '24h';

export function parseRange(raw: string | null): MetricRange {
  return METRIC_RANGES.includes(raw as MetricRange)
    ? (raw as MetricRange)
    : DEFAULT_RANGE;
}

export function useObservabilityRange(): {
  readonly range: MetricRange;
  readonly setRange: (next: MetricRange) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = parseRange(searchParams.get('range'));
  const setRange = (next: MetricRange): void => {
    const params = new URLSearchParams(searchParams);
    params.set('range', next);
    setSearchParams(params, { replace: true });
  };
  return { range, setRange };
}
