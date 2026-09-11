/**
 * Identity context.
 *
 * The single source of truth for authentication state. Every consumer that needs
 * to know about the current session, user or organization reads from this context.
 */
import { createContext } from 'react';
import type {
  TwoFactorChallenge,
  Session,
  CurrentUser,
  OrganizationContext,
  SignInCredentials,
} from '@types';

export interface IdentityContextValue {
  /** The current session state. */
  readonly session: Session;

  /** True while silently restoring a session during startup. */
  readonly isRestoring: boolean;

  /** The authenticated user, if signed in. */
  readonly user: CurrentUser | undefined;

  /** The active organization context, if applicable. */
  readonly organization: OrganizationContext | undefined;

  /** True when the user is authenticated. */
  readonly isAuthenticated: boolean;

  /**
   * Signs in with credentials.
   *
   * Phase 10.3 — resolves to a `TwoFactorChallenge` when the password
   * alone was not enough, and to `undefined` when a session was
   * established. The challenge is deliberately NOT stored as session
   * state: it carries no token and confers no access, so the caller must
   * finish via `completeTwoFactor`.
   */
  readonly signIn: (
    credentials: SignInCredentials
  ) => Promise<TwoFactorChallenge | undefined>;

  /** Completes a sign-in that stopped for a second factor. */
  readonly completeTwoFactor: (input: {
    challengeId: string;
    token?: string;
    recoveryCode?: string;
  }) => Promise<void>;

  /** Signs out the current user. */
  readonly signOut: () => Promise<void>;

  /** Switches the active organization. */
  readonly switchOrganization: (organizationId: string) => void;

  /** Refreshes the current session. */
  readonly refreshSession: () => Promise<void>;
}

export const IdentityContext = createContext<IdentityContextValue | undefined>(
  undefined
);

IdentityContext.displayName = 'IdentityContext';
