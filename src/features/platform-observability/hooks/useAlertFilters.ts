/**
 * The Alerts Center filters, held in the URL so a filtered view is
 * shareable (the Health page links straight to `?status=active&severity=…`)
 * and survives a reload. Unrecognised values fall back to their default.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AlertsQuery } from '../services/PlatformObservabilityService';
import { parseRange } from './useObservabilityRange';

const STATUSES: readonly AlertsQuery['status'][] = [
  'all',
  'active',
  'resolved',
];
const SEVERITIES: readonly NonNullable<AlertsQuery['severity']>[] = [
  'critical',
  'warning',
  'info',
];

export function parseAlertFilters(params: URLSearchParams): AlertsQuery {
  const status = params.get('status') as AlertsQuery['status'];
  const severity = params.get('severity') as AlertsQuery['severity'];
  const rule = params.get('rule')?.trim();
  return {
    status: STATUSES.includes(status) ? status : 'all',
    ...(severity && SEVERITIES.includes(severity) ? { severity } : {}),
    ...(rule ? { rule } : {}),
    range: parseRange(params.get('range')),
  };
}

export function useAlertFilters(): {
  readonly filters: AlertsQuery;
  readonly setFilter: (
    key: keyof AlertsQuery,
    value: string | undefined
  ) => void;
  readonly clear: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const serialized = searchParams.toString();
  const filters = useMemo(
    () => parseAlertFilters(new URLSearchParams(serialized)),
    [serialized]
  );

  const setFilter = (key: keyof AlertsQuery, value: string | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, value);
    setSearchParams(params, { replace: true });
  };

  const clear = () => {
    const params = new URLSearchParams();
    const range = searchParams.get('range');
    if (range) params.set('range', range);
    setSearchParams(params, { replace: true });
  };

  return { filters, setFilter, clear };
}
