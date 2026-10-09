/**
 * Local-first dashboard — React views of the connectivity and outbox
 * stores (`@services/offline`).
 */
import { useSyncExternalStore } from 'react';
import {
  getConnectivity,
  getOutboxSnapshot,
  subscribeConnectivity,
  subscribeOutbox,
} from '@services/offline';
import type { ConnectivitySnapshot, OutboxSnapshot } from '@services/offline';

export function useConnectivity(): ConnectivitySnapshot {
  return useSyncExternalStore(
    (listener) => subscribeConnectivity(listener),
    getConnectivity,
    getConnectivity
  );
}

export function useOutboxState(): OutboxSnapshot {
  return useSyncExternalStore(
    (listener) => subscribeOutbox(listener),
    getOutboxSnapshot,
    getOutboxSnapshot
  );
}
