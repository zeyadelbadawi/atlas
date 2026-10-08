/**
 * Local-first dashboard — who was signed in, for a read-only offline start.
 *
 * Saved at every online sign-in/restore, read only when the browser starts
 * WITHOUT a connection while it still holds the session hint. It authorizes
 * nothing: every request still needs a server-issued token, and the server
 * re-validates the session the moment the connection returns. It only lets
 * the dashboard show that person's own saved copies instead of a sign-in
 * screen they cannot submit offline. Wiped with the rest of the offline
 * store at sign-out.
 */
import type { CurrentUser, OrganizationContext } from '@types';
import { offlineStore } from './offline-store';

/** An offline start older than this needs the network again. */
export const IDENTITY_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const KEY = 'identity';

export interface IdentitySnapshot {
  readonly user: CurrentUser;
  readonly organization?: OrganizationContext;
  readonly savedAt: number;
}

export async function saveIdentitySnapshot(
  user: CurrentUser,
  organization?: OrganizationContext
): Promise<void> {
  await offlineStore().put<IdentitySnapshot>('meta', KEY, {
    user,
    organization,
    savedAt: Date.now(),
  });
}

export async function loadIdentitySnapshot(
  now: number = Date.now()
): Promise<IdentitySnapshot | null> {
  const snapshot = await offlineStore().get<IdentitySnapshot>('meta', KEY);
  if (!snapshot || now - snapshot.savedAt > IDENTITY_SNAPSHOT_TTL_MS)
    return null;
  return snapshot;
}

/*
 * SIGN-OUT WHILE OFFLINE. Signing out clears this tab at once, but the
 * server-side session (the HttpOnly refresh cookie) can only be revoked
 * online. Without this marker, the next person to open Atlas on this device
 * once it is back online would be silently signed in as the previous one.
 * The marker is in localStorage (synchronous, read before anything else at
 * start-up); `sessionService.restore` revokes the session server-side first
 * and only then clears it.
 */
const PENDING_SIGN_OUT_KEY = 'atlas:pending-sign-out';

export function markPendingSignOut(): void {
  try {
    window.localStorage.setItem(PENDING_SIGN_OUT_KEY, String(Date.now()));
  } catch {
    // Storage blocked: nothing to persist; the tab itself is signed out.
  }
}

export function hasPendingSignOut(): boolean {
  try {
    return window.localStorage.getItem(PENDING_SIGN_OUT_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearPendingSignOut(): void {
  try {
    window.localStorage.removeItem(PENDING_SIGN_OUT_KEY);
  } catch {
    // Nothing stored.
  }
}
