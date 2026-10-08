/**
 * Local-first dashboard — when the saved copies on screen were taken, so
 * the offline notice can say "showing data saved at 14:05".
 */
import { useSyncExternalStore } from 'react';

let savedAt: number | null = null;
const listeners = new Set<() => void>();

export function setOfflineSavedAt(value: number | null): void {
  savedAt = value;
  for (const listener of listeners) listener();
}

export function useOfflineSavedAt(): number | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => savedAt,
    () => null
  );
}
