/**
 * Persists a value in local storage.
 *
 * Storage access is guarded, so a quota error or a privacy mode cannot break the
 * component: state simply stays in memory for the session. Only non-sensitive
 * preference data may be persisted.
 */
import { useCallback, useEffect, useState } from 'react';
import { readStoredValue, writeStoredValue } from '@utils';

export interface StoredValueState<TValue> {
  readonly value: TValue;
  readonly setValue: (next: TValue | ((previous: TValue) => TValue)) => void;
}

export function useLocalStorage<TValue>(
  key: string,
  initialValue: TValue
): StoredValueState<TValue> {
  const [value, setStateValue] = useState<TValue>(() =>
    readStoredValue(key, initialValue)
  );

  const setValue = useCallback(
    (next: TValue | ((previous: TValue) => TValue)) => {
      setStateValue((previous) => {
        const resolved =
          typeof next === 'function'
            ? (next as (value: TValue) => TValue)(previous)
            : next;

        writeStoredValue(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    // Keeps duplicate tabs of the same console in sync.
    const handleStorageChange = (event: StorageEvent): void => {
      if (event.key !== key) return;
      setStateValue(readStoredValue(key, initialValue));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
    // `initialValue` is only a fallback; re-subscribing on identity change
    // would needlessly detach the listener on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, setValue };
}