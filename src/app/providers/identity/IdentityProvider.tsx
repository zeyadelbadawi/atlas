/**
 * Identity Provider.
 *
 * Manages authentication state and exposes identity operations to the application.
 * This provider initializes by attempting silent session restoration, then keeps
 * the session alive through token refresh and handles sign-in/sign-out.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isTwoFactorChallenge } from '@types';
import type { ReactNode } from 'react';
import { sessionService } from '@services/identity';
import type { Session, SignInCredentials } from '@types';
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

    if (isTwoFactorChallenge(result)) {
      return result;
    }

    setSession(result);
    return undefined;
  }, []);

  /** Completes a challenged sign-in. Only here does the session become real. */
  const completeTwoFactor = useCallback(
    async (input: {
      challengeId: string;
      token?: string;
      recoveryCode?: string;
    }) => {
      const newSession = await sessionService.completeTwoFactor(input);
      setSession(newSession);
    },
    []
  );

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

  const refreshSession = useCallback(async () => {
    if (session.status !== 'authenticated' || !session.tokens?.refreshToken) {
      return;
    }

    const refreshed = await sessionService.refresh(session.tokens.refreshToken);
    setSession(refreshed);
  }, [session]);

  const value: IdentityContextValue = useMemo(
    () => ({
      session,
      isRestoring,
      user: session.user,
      organization: session.organization,
      isAuthenticated: session.status === 'authenticated',
      signIn,
      completeTwoFactor,
      signOut,
      switchOrganization,
      refreshSession,
    }),
    [
      session,
      isRestoring,
      signIn,
      completeTwoFactor,
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
