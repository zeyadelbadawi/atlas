/**
 * Debounces a rapidly changing value.
 *
 * Used to keep expensive work — search requests, filtering, validation — from
 * running on every keystroke.
 */
import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@config';

export function useDebounce<TValue>(
  value: TValue,
  delayMs: number = APP_CONFIG.searchDebounceMs
): TValue {
  const [debouncedValue, setDebouncedValue] = useState<TValue>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}