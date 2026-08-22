/**
 * Identity context.
 *
 * The single source of truth for authentication state. Every consumer that needs
 * to know about the current session, user or organization reads from this context.
 */
import { createContext } from 'react';
import type {
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

  /** Signs in with credentials. */
  readonly signIn: (credentials: SignInCredentials) => Promise<void>;

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