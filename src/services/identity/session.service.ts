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
import type {
  SignInCredentials,
  Session,
  CurrentUser,
  TokenMetadata,
  OrganizationContext,
} from '@types';

export class SessionService {
  /**
   * Signs in a user with credentials.
   *
   * @param credentials Sign-in credentials.
   * @returns The new session.
   */
  public async signIn(credentials: SignInCredentials): Promise<Session> {
    const response = await authenticationService.signIn(credentials);

    const tokens = tokenService.createMetadata(
      response.accessToken,
      response.expiresIn,
      response.refreshToken
    );

    tokenService.store(tokens);

    const organization = this.selectPrimaryOrganization(response.user);

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
    await authenticationService.signOut();
    tokenService.clear();

    return {
      status: 'unauthenticated',
    };
  }

  /**
   * Silently restores a session from stored tokens.
   *
   * Used during application startup to restore the user's session without
   * requiring them to sign in again.
   *
   * @returns The restored session, or an unauthenticated session if restoration fails.
   */
  public async restore(): Promise<Session> {
    const tokens = tokenService.retrieve();

    if (!tokens) {
      return { status: 'unauthenticated' };
    }

    // If tokens are expired, attempt refresh.
    if (tokenService.isExpired(tokens.expiresAt)) {
      if (tokens.refreshToken) {
        try {
          return await this.refresh(tokens.refreshToken);
        } catch {
          tokenService.clear();
          return { status: 'unauthenticated' };
        }
      } else {
        tokenService.clear();
        return { status: 'unauthenticated' };
      }
    }

    // Validate session with backend.
    const isValid = await authenticationService.validateSession();
    if (!isValid) {
      tokenService.clear();
      return { status: 'unauthenticated' };
    }

    // Fetch current user.
    try {
      const user = await currentUserService.getCurrent();
      const organization = this.selectPrimaryOrganization(user);

      return {
        status: 'authenticated',
        tokens,
        user,
        organization,
      };
    } catch {
      tokenService.clear();
      return { status: 'unauthenticated' };
    }
  }

  /**
   * Refreshes an expired access token.
   *
   * @param refreshToken The refresh token.
   * @returns The new session with refreshed tokens.
   */
  public async refresh(refreshToken: string): Promise<Session> {
    const response = await authenticationService.refreshToken({ refreshToken });

    const tokens = tokenService.createMetadata(
      response.accessToken,
      response.expiresIn,
      response.refreshToken
    );

    tokenService.store(tokens);

    const user = await currentUserService.getCurrent();
    const organization = this.selectPrimaryOrganization(user);

    return {
      status: 'authenticated',
      tokens,
      user,
      organization,
    };
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
    return tokens.requiresRefresh && !!tokens.refreshToken;
  }
}

export const sessionService = new SessionService();