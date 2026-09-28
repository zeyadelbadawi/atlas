/**
 * Identity Provider.
 *
 * Manages authentication state and exposes identity operations to the application.
 * This provider initializes by attempting silent session restoration, then keeps
 * the session alive through token refresh and handles sign-in/sign-out.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isEmailOtpChallenge, isTwoFactorChallenge } from '@types';
import type { ReactNode } from 'react';
import { currentUserService, sessionService } from '@services/identity';
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
   * Proactively refreshes tokens when they approach expiration.
   */
  useEffect(() => {
    if (session.status !== 'authenticated' || !session.tokens) {
      return;
    }

    if (!sessionService.shouldRefreshTokens(session.tokens)) {
      return;
    }

    let cancelled = false;

    async function refreshTokens() {
      if (!session.tokens?.refreshToken) return;

      try {
        const refreshed = await sessionService.refresh(
          session.tokens.refreshToken
        );
        if (!cancelled) {
          setSession(refreshed);
        }
      } catch {
        // Refresh failure invalidates the session.
        if (!cancelled) {
          setSession({ status: 'unauthenticated' });
        }
      }
    }

    void refreshTokens();

    return () => {
      cancelled = true;
    };
  }, [session]);

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
   * New Customer Onboarding made two gaps matter, and both are closed
   * here: a session holding no refresh token used to make this a silent
   * no-op (the user kept the stale flag and `/dashboard` bounced them
   * back into setup), so it now falls back to `GET /users/me` with the
   * current tokens; and a refresh used to reset the active organization
   * to the primary one, so the active organization is kept whenever the
   * refreshed user is still a member of it.
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

    if (!session.tokens?.refreshToken) {
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
      return;
    }

    const refreshed = await sessionService.refresh(session.tokens.refreshToken);
    setSession(keepActiveOrganization(refreshed));
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
