/**
 * Session Service.
 *
 * Orchestrates the session lifecycle: sign-in, sign-out, silent restoration,
 * token refresh and session invalidation. This service coordinates between
 * AuthenticationService, TokenService and the identity state.
 */
import { authenticationService } from './authentication.service';
import { currentUserService } from './current-user.service';
import { tokenService } from './token.service';
import { STORAGE_KEYS } from '@constants';
import { isEmailOtpChallenge, isTwoFactorChallenge } from '@types';
import { twoFactorService } from './two-factor.service';
import {
  announceSessionEnded,
  announceSignedIn,
  isDefinitiveAuthFailure,
} from './session-events';
import {
  clearOfflineData,
  clearPendingSignOut,
  hasPendingSignOut,
  loadIdentitySnapshot,
  markPendingSignOut,
  saveIdentitySnapshot,
} from '../offline';
import type {
  AuthenticationResponse,
  SignInCredentials,
  Session,
  CurrentUser,
  TokenMetadata,
  OrganizationContext,
  TwoFactorChallenge,
  TwoFactorVerifyInput,
  EmailOtpChallenge,
  EmailOtpVerifyInput,
} from '@types';

/**
 * Runs `work` while holding a lock shared by every tab of this origin, so two
 * tabs never refresh at once: the session cookie is shared, and each refresh
 * ROTATES it, so a second concurrent refresh would present a token the first
 * just retired. Browsers without the Web Locks API run `work` directly; the
 * refresh then retries once on a 401 (see `performRefresh`).
 */
function withCrossTabRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  if (!locks?.request) return work();
  return locks.request('atlas:session-refresh', () => work()) as Promise<T>;
}

/**
 * Local-first — remembers who signed in, for a read-only offline start.
 * A DIFFERENT person than the one whose copies this browser holds wipes
 * those copies first (sign-out normally already did; a session that simply
 * lapsed did not), so one learner's saved lessons, drafts and queued
 * changes can never be shown to — or synced as — the next.
 */
async function rememberIdentity(
  user: CurrentUser,
  organization?: OrganizationContext
): Promise<void> {
  const previous = await loadIdentitySnapshot(Number.NEGATIVE_INFINITY);
  if (previous && previous.user.id !== user.id) await clearOfflineData();
  await saveIdentitySnapshot(user, organization);
}

/** The "Last used" hint on the sign-in pages. Best effort: storage may be unavailable. */
function rememberAuthMethod(
  method: AuthenticationResponse['authMethod']
): void {
  if (method !== 'password' && method !== 'google') return;
  try {
    localStorage.setItem(STORAGE_KEYS.lastAuthMethod, method);
  } catch {
    // Private mode or blocked storage — the hint is only a convenience.
  }
}

export class SessionService {
  /**
   * Single-flight guard for token refresh (session-inactivity bug fix).
   *
   * Refresh tokens ROTATE server-side (`auth.service.refresh`): presenting
   * the same token twice makes the second call fail with a denylisted-token
   * 401. Multiple initiators can want a refresh at once — the 401 response
   * interceptor, the IdentityProvider proactive-expiry effect,
   * `refreshSession`, and `restore` — so without coordination two of them
   * race on the same rotating token and one loses, which is exactly the
   * "next request fails after the tab was idle, until a reload" bug. Every
   * refresh funnels through `refresh()`, so coalescing concurrent calls into
   * ONE in-flight refresh here guarantees the rotating token is presented
   * exactly once. It weakens nothing: rotation, denylist and JWT validation
   * are unchanged; this only stops the client racing itself.
   */
  private refreshInFlight: Promise<Session> | null = null;

  /**
   * Signs in a user with credentials.
   *
   * @param credentials Sign-in credentials.
   * @returns The new session.
   */
  public async signIn(
    credentials: SignInCredentials
  ): Promise<Session | TwoFactorChallenge | EmailOtpChallenge> {
    const response = await authenticationService.signIn(credentials);

    // P66 — same rule as the second factor below: an email-code
    // challenge carries no token and is returned untouched.
    if (isEmailOtpChallenge(response)) {
      return response;
    }

    // Phase 10.3 — the password alone was not enough. Return the
    // challenge UNCHANGED and store nothing: there is no token here, and
    // treating the challenge id as one would be exactly the mistake the
    // backend contract is shaped to prevent. The caller routes the user
    // to the second-factor step and calls `completeTwoFactor` below.
    if (isTwoFactorChallenge(response)) {
      return response;
    }

    return this.establishSession(response);
  }

  /**
   * Phase 10.3 — completes a sign-in that stopped for a second factor.
   *
   * Shares `establishSession` with the password-only path, so a session
   * created via 2FA is stored and shaped identically — there is no second
   * notion of "logged in" to keep in sync.
   */
  public async completeTwoFactor(
    input: TwoFactorVerifyInput
  ): Promise<Session> {
    const response = await twoFactorService.verifyChallenge(input);
    return this.establishSession(response);
  }

  /** P66 — completes a sign-in that stopped for an emailed code; same `establishSession`. */
  public async completeEmailOtp(input: EmailOtpVerifyInput): Promise<Session> {
    const response = await authenticationService.verifyEmailOtp(input);
    return this.establishSession(response);
  }

  /**
   * Google Identity — adopts a session minted by a Google completion or
   * step. The same `establishSession` as every other path.
   */
  public acceptAuthenticationResponse(
    response: AuthenticationResponse
  ): Session {
    return this.establishSession(response);
  }

  private establishSession(response: AuthenticationResponse): Session {
    rememberAuthMethod(response.authMethod);
    // The refresh token was set as an HttpOnly cookie by the response itself;
    // only the short-lived access token is kept, in memory.
    const tokens = tokenService.createMetadata(
      response.accessToken,
      response.expiresIn
    );

    tokenService.store(tokens);

    const organization = this.selectPrimaryOrganization(response.user);
    // Every other tab shares the session cookie that was just replaced: one
    // still holding another person's state starts over (session-events).
    announceSignedIn(response.user.id);
    clearPendingSignOut();
    void rememberIdentity(response.user, organization);

    return {
      status: 'authenticated',
      tokens,
      user: response.user,
      organization,
    };
  }

  /**
   * Signs out the current user.
   *
   * Terminates the session both locally and on the backend.
   */
  public async signOut(): Promise<Session> {
    // The server ends the session identified by the access token or, when
    // that has lapsed, by the session cookie — and clears the cookie.
    try {
      await authenticationService.signOut();
    } catch (error) {
      // Offline (or the server unreachable): this tab signs out anyway, and
      // the server-side session is revoked the next time Atlas starts online
      // — before anything could restore it (see `restore`).
      if (isDefinitiveAuthFailure(error)) {
        // The server already considers the session over; nothing pending.
      } else {
        markPendingSignOut();
      }
    }
    tokenService.clear();
    // Local-first dashboard — saved copies and queued changes belong to the
    // person who just left; never to whoever uses this browser next.
    await clearOfflineData();
    // Sign-out in one tab signs every tab out (they share the cookie that
    // was just cleared) instead of leaving them showing a dead session.
    announceSessionEnded();
    // The remembered academy belongs to the account that just left, never
    // to whoever signs in next in this browser (22 Sep 2026 audit).
    localStorage.removeItem(STORAGE_KEYS.activeAcademy);

    return {
      status: 'unauthenticated',
    };
  }

  /**
   * Silently restores the session on application start.
   *
   * The access token lives only in memory, so after a reload there is none:
   * the session is re-obtained from the HttpOnly session cookie with one
   * `POST /auth/refresh`. That call is skipped entirely when this browser has
   * no sign of a session on this host (an anonymous visitor).
   */
  public async restore(): Promise<Session> {
    // Someone signed out while offline: revoke that session on the server
    // FIRST. Until that succeeds nothing is restored — the cookie may still
    // be valid, and it belongs to the person who signed out.
    if (hasPendingSignOut()) {
      try {
        await authenticationService.signOut();
        clearPendingSignOut();
      } catch (error) {
        if (isDefinitiveAuthFailure(error)) clearPendingSignOut();
      }
      tokenService.clear();
      return { status: 'unauthenticated' };
    }

    if (!tokenService.mayHaveSession()) {
      return { status: 'unauthenticated' };
    }

    const tokens = tokenService.retrieve();
    if (tokens && !tokenService.isExpired(tokens.expiresAt)) {
      try {
        const user = await currentUserService.getCurrent();
        return {
          status: 'authenticated',
          tokens,
          user,
          organization: this.selectPrimaryOrganization(user),
        };
      } catch {
        // Fall through to a refresh.
      }
    }

    try {
      const restored = await this.refresh();
      if (restored.user)
        void rememberIdentity(restored.user, restored.organization);
      return restored;
    } catch (error) {
      // Only the server saying "no" ends the session. A reload without a
      // connection keeps the session hint, so the next load restores it
      // instead of treating a network blip as a sign-out.
      if (isDefinitiveAuthFailure(error)) {
        tokenService.clear();
        await clearOfflineData();
        return { status: 'unauthenticated' };
      }
      // Local-first dashboard — no server to ask: resume READ-ONLY as the
      // person saved at their last online start, so they can read their
      // saved copies. No token is issued; the server re-checks the session
      // the moment the connection returns (IdentityProvider).
      const snapshot = await loadIdentitySnapshot();
      if (snapshot) {
        return {
          status: 'authenticated',
          user: snapshot.user,
          organization: snapshot.organization,
          offline: true,
        };
      }
      return { status: 'unauthenticated' };
    }
  }

  /**
   * Obtains a new access token from the session cookie (rotating it).
   * Concurrent callers in this tab share one request, and tabs take turns.
   */
  public async refresh(): Promise<Session> {
    // Coalesce concurrent refreshes (see `refreshInFlight`'s doc comment).
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    this.refreshInFlight = (async () => {
      // Only the cookie rotation holds the cross-tab lock. Loading the
      // profile afterwards inside it could wait on itself: a 401 there sends
      // the interceptor back into `refresh()`, i.e. into this very promise,
      // while the lock stays held for every tab.
      const tokens = await withCrossTabRefreshLock(() => this.rotateToken());
      // Marked as already-refreshed: a 401 here is a final answer, never a
      // second refresh of the session just obtained.
      const user = await currentUserService.getCurrent({
        headers: { 'X-Retry-After-Refresh': 'true' },
      });
      return {
        status: 'authenticated' as const,
        tokens,
        user,
        organization: this.selectPrimaryOrganization(user),
      };
    })().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  /** The cookie rotation — always invoked through the single-flight `refresh`, under the cross-tab lock. */
  private async rotateToken(): Promise<TokenMetadata> {
    // A session an older build left in localStorage is converted into the
    // cookie by presenting its token once; it is deleted as it is read.
    const legacy = tokenService.takeLegacyRefreshToken();
    let response;
    try {
      response = await authenticationService.refreshToken(
        legacy ? { refreshToken: legacy } : {}
      );
    } catch (error) {
      // Without the Web Locks API another tab may have rotated the cookie a
      // moment ago; the browser now holds the new one, so try once more.
      if (legacy || (globalThis.navigator as Navigator | undefined)?.locks) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
      response = await authenticationService.refreshToken({});
    }

    const tokens = tokenService.createMetadata(
      response.accessToken,
      response.expiresIn
    );

    tokenService.store(tokens);
    return tokens;
  }

  /**
   * Switches the active organization.
   *
   * @param user The current user.
   * @param organizationId The organization to switch to.
   * @returns The new organization context.
   */
  public switchOrganization(
    user: CurrentUser,
    organizationId: string
  ): OrganizationContext | undefined {
    const membership = user.organizations.find(
      (org) => org.organizationId === organizationId
    );

    if (!membership) {
      return undefined;
    }

    return {
      id: membership.organizationId,
      name: membership.organizationName,
      role: membership.role,
      permissions: membership.permissions,
    };
  }

  /**
   * Selects the primary organization for a user.
   *
   * @param user The user.
   * @returns The primary organization context, if available.
   */
  private selectPrimaryOrganization(
    user: CurrentUser
  ): OrganizationContext | undefined {
    const primary = user.organizations.find((org) => org.isPrimary);

    if (!primary && user.organizations.length > 0) {
      const first = user.organizations[0];
      return {
        id: first.organizationId,
        name: first.organizationName,
        role: first.role,
        permissions: first.permissions,
      };
    }

    if (!primary) {
      return undefined;
    }

    return {
      id: primary.organizationId,
      name: primary.organizationName,
      role: primary.role,
      permissions: primary.permissions,
    };
  }

  /**
   * Reports whether tokens should be refreshed proactively.
   *
   * @param tokens Token metadata.
   */
  public shouldRefreshTokens(tokens: TokenMetadata): boolean {
    return tokens.requiresRefresh;
  }
}

export const sessionService = new SessionService();
