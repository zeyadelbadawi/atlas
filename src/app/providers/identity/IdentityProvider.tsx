/**
 * Identity Provider.
 *
 * Manages authentication state and exposes identity operations to the application.
 * This provider initializes by attempting silent session restoration, then keeps
 * the session alive through token refresh and handles sign-in/sign-out.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEmailOtpChallenge, isTwoFactorChallenge } from '@types';
import type { ReactNode } from 'react';
import {
  announceSessionEnded,
  currentUserService,
  isDefinitiveAuthFailure,
  sessionService,
  subscribeToSessionSignals,
  tokenService,
} from '@services/identity';
import { getGlobalQueryClient } from '@services/query';
import { clearOfflineData } from '@services/offline';
import type {
  Session,
  SignInCredentials,
  TwoFactorVerifyInput,
  EmailOtpVerifyInput,
  GoogleSignInResult,
} from '@types';
import { IdentityContext } from './identity.context';
import type { IdentityContextValue } from './identity.context';
import { STORAGE_KEYS } from '@constants';

export interface IdentityProviderProps {
  readonly children: ReactNode;
}

/** How long before the access token expires the proactive refresh runs. */
const PROACTIVE_REFRESH_LEAD_MS = 2 * 60 * 1000;

const INITIAL_SESSION: Session = {
  status: 'restoring',
};

export function AtlasIdentityProvider({
  children,
}: IdentityProviderProps): JSX.Element {
  const [session, setSession] = useState<Session>(INITIAL_SESSION);
  const [isRestoring, setIsRestoring] = useState(true);

  /**
   * Silently restores the session on mount.
   */
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        let restored = await sessionService.restore();
        if (!cancelled) {
          // Validate and restore active organization from localStorage.
          if (restored.status === 'authenticated' && restored.user) {
            const storedOrgId = localStorage.getItem(
              STORAGE_KEYS.activeOrganization
            );
            if (storedOrgId) {
              const isValidOrg = restored.user.organizations.some(
                (org) => org.organizationId === storedOrgId
              );

              if (isValidOrg) {
                // Restore the valid organization context.
                const orgContext = sessionService.switchOrganization(
                  restored.user,
                  storedOrgId
                );
                if (orgContext) {
                  // Create a new session object with the restored organization.
                  restored = {
                    ...restored,
                    organization: orgContext,
                  };
                }
              } else {
                // Invalid organization; clear from storage.
                localStorage.removeItem(STORAGE_KEYS.activeOrganization);
              }
            }
          }

          setSession(restored);
        }
      } catch {
        if (!cancelled) {
          setSession({ status: 'unauthenticated' });
        }
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Listens for token refresh events from the HTTP interceptor.
   * When tokens are refreshed in the background (401 retry), only the token
   * metadata needs to be synchronized. The user and organization context
   * remain unchanged.
   */
  useEffect(() => {
    const handleTokenRefresh = async () => {
      // Import dynamically to avoid circular dependency.
      const { tokenService } = await import('@services/identity');
      const tokens = tokenService.retrieve();

      if (tokens && session.status === 'authenticated') {
        setSession((prev) => ({
          ...prev,
          tokens,
        }));
      }
    };

    window.addEventListener('atlas:token-refreshed', handleTokenRefresh);

    return () => {
      window.removeEventListener('atlas:token-refreshed', handleTokenRefresh);
    };
  }, [session.status]);

  /**
   * Stale-tab recovery — the session as every OTHER part of the app (and
   * every other tab) learns about it.
   *  - Ended (the server refused a refresh, or another tab signed out):
   *    forget the token and every cached query, and become unauthenticated
   *    so the route guard sends the person to sign in — instead of a
   *    signed-in UI in which nothing works.
   *  - Another tab signed in as SOMEONE ELSE: the shared session cookie now
   *    belongs to them, so this tab's in-memory identity and cached data
   *    are another person's; start over from the current session.
   */
  const sessionRef = useRef(session);
  sessionRef.current = session;
  useEffect(
    () =>
      subscribeToSessionSignals({
        onEnded: () => {
          tokenService.clear();
          getGlobalQueryClient().clear();
          // The saved offline copies belonged to that session too.
          void clearOfflineData();
          setSession({ status: 'unauthenticated' });
        },
        onSignedInElsewhere: (userId) => {
          const current = sessionRef.current;
          if (
            current.status === 'authenticated' &&
            current.user?.id !== userId
          ) {
            getGlobalQueryClient().clear();
            void clearOfflineData().finally(() => window.location.reload());
          }
        },
      }),
    []
  );

  /**
   * Local-first dashboard — a session resumed OFFLINE (from the identity
   * saved at the last online start) is only a promise to check. As soon as
   * the connection returns, the server decides: the same person → the real
   * session replaces it; refused → signed out everywhere and the saved
   * copies wiped; someone else → everything local is discarded and the app
   * starts over as them.
   */
  const isOfflineSession =
    session.status === 'authenticated' && session.offline === true;
  useEffect(() => {
    if (!isOfflineSession) return;
    let cancelled = false;
    let inFlight = false;
    const revalidate = async (): Promise<void> => {
      if (cancelled || inFlight) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false)
        return;
      inFlight = true;
      try {
        const offlineUserId = sessionRef.current.user?.id;
        const verified = await sessionService.restore();
        if (cancelled) return;
        if (verified.status === 'authenticated' && !verified.offline) {
          if (verified.user?.id !== offlineUserId) {
            getGlobalQueryClient().clear();
            await clearOfflineData();
            window.location.reload();
            return;
          }
          setSession((previous) => ({
            ...verified,
            // Keep the organization the person is working in.
            organization: previous.organization ?? verified.organization,
          }));
        } else if (verified.status === 'unauthenticated') {
          getGlobalQueryClient().clear();
          setSession({ status: 'unauthenticated' });
        }
      } finally {
        inFlight = false;
      }
    };
    void revalidate();
    window.addEventListener('online', revalidate);
    const retry = setInterval(() => void revalidate(), 30_000);
    return () => {
      cancelled = true;
      window.removeEventListener('online', revalidate);
      clearInterval(retry);
    };
  }, [isOfflineSession]);

  /**
   * Proactively refreshes the access token before it expires — on a timer,
   * and again whenever the tab becomes visible or the connection returns
   * (timers do not run while a laptop sleeps, which is exactly when a tab
   * goes stale). The 401 → refresh → retry path in the HTTP client remains
   * the safety net. A refresh the server REFUSES ends the session everywhere;
   * one that cannot reach the server is left for the next attempt.
   */
  const expiresAt =
    session.status === 'authenticated' ? session.tokens?.expiresAt : undefined;
  useEffect(() => {
    if (!expiresAt) return;
    let cancelled = false;

    const refreshIfDue = async (): Promise<void> => {
      if (cancelled || !tokenService.shouldRefresh(expiresAt)) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false)
        return;
      try {
        const refreshed = await sessionService.refresh();
        if (!cancelled && refreshed.status === 'authenticated') {
          // Keep the organization the person is working in.
          setSession((previous) => ({
            ...previous,
            tokens: refreshed.tokens,
            user: refreshed.user,
          }));
        }
      } catch (error) {
        if (!cancelled && isDefinitiveAuthFailure(error))
          announceSessionEnded();
      }
    };

    const dueIn =
      new Date(expiresAt).getTime() - Date.now() - PROACTIVE_REFRESH_LEAD_MS;
    const timer = setTimeout(() => void refreshIfDue(), Math.max(0, dueIn));
    const onWake = (): void => {
      if (document.visibilityState === 'visible') void refreshIfDue();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    window.addEventListener('focus', onWake);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [expiresAt]);

  /**
   * Phase 10.3 — sign-in can now end in one of two places: an
   * authenticated session, or a second-factor challenge.
   *
   * A challenge is NOT stored as session state. It carries no token and
   * confers no access, so putting it anywhere near the authenticated
   * session shape would risk some future code path treating a
   * half-authenticated user as signed in. It is returned to the caller
   * instead, which shows the code entry step and finishes via
   * `completeTwoFactor`.
   */
  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const result = await sessionService.signIn(credentials);

    if (isTwoFactorChallenge(result) || isEmailOtpChallenge(result)) {
      return result;
    }

    setSession(result);
    return undefined;
  }, []);

  /** Google Identity — the same split as `signIn`, for a response already in hand. */
  const acceptSignInResult = useCallback((result: GoogleSignInResult) => {
    if (isTwoFactorChallenge(result) || isEmailOtpChallenge(result)) {
      return result;
    }
    setSession(sessionService.acceptAuthenticationResponse(result));
    return undefined;
  }, []);

  /** Completes a challenged sign-in. Only here does the session become real. */
  const completeTwoFactor = useCallback(async (input: TwoFactorVerifyInput) => {
    const newSession = await sessionService.completeTwoFactor(input);
    setSession(newSession);
  }, []);

  /** P66 — completes an email-code challenge. Only here does the session become real. */
  const completeEmailOtp = useCallback(async (input: EmailOtpVerifyInput) => {
    const newSession = await sessionService.completeEmailOtp(input);
    setSession(newSession);
  }, []);

  const signOut = useCallback(async () => {
    const unauthenticated = await sessionService.signOut();
    setSession(unauthenticated);
  }, []);

  const switchOrganization = useCallback(
    (organizationId: string) => {
      if (!session.user) return;

      const newOrganization = sessionService.switchOrganization(
        session.user,
        organizationId
      );

      if (newOrganization) {
        setSession((prev) => ({
          ...prev,
          organization: newOrganization,
        }));

        // Notify PlatformProvider and other listeners of the organization switch.
        window.dispatchEvent(
          new CustomEvent('atlas:organization-switched', {
            detail: { organizationId },
          })
        );

        // Persist the active organization to localStorage.
        localStorage.setItem(STORAGE_KEYS.activeOrganization, organizationId);
      }
    },
    [session.user]
  );

  /**
   * Re-reads the session user from the server — after a profile change,
   * an organization create, or finishing onboarding (whose
   * `onboardingPending` flag only the server computes).
   *
   * It is always `GET /users/me` with the current access token — re-reading
   * the user never needs a session rotation — and the active organization
   * is kept whenever the refreshed user is still a member of it.
   */
  const refreshSession = useCallback(async () => {
    if (session.status !== 'authenticated') {
      return;
    }

    const activeOrganizationId = session.organization?.id;
    const keepActiveOrganization = (next: Session): Session => {
      if (!activeOrganizationId || !next.user) return next;
      const organization = sessionService.switchOrganization(
        next.user,
        activeOrganizationId
      );
      return organization ? { ...next, organization } : next;
    };

    // Re-reading the user needs no token rotation: `GET /users/me` with the
    // in-memory access token (the HTTP client refreshes it from the session
    // cookie if it has lapsed).
    const user = await currentUserService.getCurrent();
    const fallback =
      user.organizations.find((membership) => membership.isPrimary) ??
      user.organizations[0];
    setSession((prev) =>
      keepActiveOrganization({
        ...prev,
        user,
        organization: fallback
          ? sessionService.switchOrganization(user, fallback.organizationId)
          : undefined,
      })
    );
  }, [session]);

  const value: IdentityContextValue = useMemo(
    () => ({
      session,
      isRestoring,
      user: session.user,
      organization: session.organization,
      isAuthenticated: session.status === 'authenticated',
      signIn,
      acceptSignInResult,
      completeTwoFactor,
      completeEmailOtp,
      signOut,
      switchOrganization,
      refreshSession,
    }),
    [
      session,
      isRestoring,
      signIn,
      acceptSignInResult,
      completeTwoFactor,
      completeEmailOtp,
      signOut,
      switchOrganization,
      refreshSession,
    ]
  );

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}
