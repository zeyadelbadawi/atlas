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
import { currentOfflineScope } from './offline-scope';

/** An offline start older than this needs the network again. */
export const IDENTITY_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const KEY = 'identity';

export interface IdentitySnapshot {
  readonly user: CurrentUser;
  readonly organization?: OrganizationContext;
  readonly savedAt: number;
  /** The offline scope it was saved in (`offline-scope.ts`); read back only there. */
  readonly scope?: string;
}

/**
 * ACADEMY WEBSITES KEEP THE MINIMUM (academy offline work). The learner
 * portal needs only who the person is to render their own saved copies:
 * id and display name (and avatar). It does not need — and an Academy
 * origin must not hold — their e-mail address, their staff memberships in
 * other organizations, permissions, roles or the list of other academies
 * they study at. Those were all being written to every academy origin the
 * person signed in on. The platform host keeps the full profile, which the
 * dashboard's offline start needs (organization and permissions).
 */
export function minimalLearnerIdentity(user: CurrentUser): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: '',
    ...(user.avatar ? { avatar: user.avatar } : {}),
    roles: [],
    permissions: [],
    organizations: [],
    organizationMemberships: [],
    principalKind: user.principalKind,
    academies: [],
    createdAt: user.createdAt,
  };
}

export async function saveIdentitySnapshot(
  user: CurrentUser,
  organization?: OrganizationContext
): Promise<void> {
  const scope = currentOfflineScope();
  const academy = scope.surface === 'academy';
  await offlineStore().put<IdentitySnapshot>('meta', KEY, {
    user: academy ? minimalLearnerIdentity(user) : user,
    organization: academy ? undefined : organization,
    savedAt: Date.now(),
    scope: scope.key,
  });
}

export async function loadIdentitySnapshot(
  now: number = Date.now()
): Promise<IdentitySnapshot | null> {
  const snapshot = await offlineStore().get<IdentitySnapshot>('meta', KEY);
  if (!snapshot || now - snapshot.savedAt > IDENTITY_SNAPSHOT_TTL_MS)
    return null;
  // A snapshot from another surface (or an older build without a scope on
  // an academy site) is never used to resume a session here.
  const scope = currentOfflineScope();
  if ((snapshot.scope ?? 'platform') !== scope.key) return null;
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
