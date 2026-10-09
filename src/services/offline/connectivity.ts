/**
 * Local-first dashboard — what the connection is doing, for the UI and for
 * TanStack Query.
 *
 *   online        requests are reaching the server
 *   offline       the browser reports no network; queries pause and show
 *                 their saved copies, online-only actions say so at once
 *   reconnecting  the network is back (or the browser claims it is) but
 *                 the server has not answered yet — including "lie-fi",
 *                 where `navigator.onLine` is true and requests still fail
 *
 * RECONNECT STORMS. When connectivity returns, TanStack Query refetches
 * every active query. A whole region regaining its connection would then
 * hit the API in the same second. `installJitteredOnlineManager` delays the
 * "online" signal by a random 0–5 s per client, which spreads that burst
 * across the window without making any single person wait noticeably.
 */
import { onlineManager } from '@tanstack/react-query';

export type ConnectivityState = 'online' | 'offline' | 'reconnecting';

export interface ConnectivitySnapshot {
  readonly state: ConnectivityState;
  /** When the current state began. */
  readonly since: number;
}

export const RECONNECT_REFETCH_JITTER_MS = 5_000;

const listeners = new Set<(snapshot: ConnectivitySnapshot) => void>();
let snapshot: ConnectivitySnapshot = {
  state:
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'offline'
      : 'online',
  since: Date.now(),
};

function set(state: ConnectivityState): void {
  if (snapshot.state === state) return;
  snapshot = { state, since: Date.now() };
  for (const listener of listeners) listener(snapshot);
}

export function getConnectivity(): ConnectivitySnapshot {
  return snapshot;
}

export function subscribeConnectivity(
  listener: (snapshot: ConnectivitySnapshot) => void
): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

/** A request failed for lack of a connection. */
export function reportNetworkFailure(): void {
  set(
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'offline'
      : 'reconnecting'
  );
}

/** A request reached the server (whatever it answered). */
export function reportServerReached(): void {
  set('online');
}

/**
 * Wires TanStack Query's online signal to the browser's, with the
 * reconnect jitter described above. Call once at start-up.
 */
export function installJitteredOnlineManager(
  random: () => number = Math.random
): void {
  onlineManager.setEventListener((setOnline) => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const onOnline = () => {
      set('reconnecting');
      if (pending) clearTimeout(pending);
      pending = setTimeout(
        () => {
          pending = null;
          setOnline(true);
        },
        Math.floor(random() * RECONNECT_REFETCH_JITTER_MS)
      );
    };
    const onOffline = () => {
      if (pending) clearTimeout(pending);
      pending = null;
      set('offline');
      setOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // TanStack Query starts out "online" and only learns otherwise from an
    // event — a reload without a connection would then fire every query.
    if (navigator.onLine === false) onOffline();
    return () => {
      if (pending) clearTimeout(pending);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });
}

/** Tests only. */
export function resetConnectivityForTesting(
  state: ConnectivityState = 'online'
): void {
  listeners.clear();
  snapshot = { state, since: Date.now() };
}
