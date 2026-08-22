/**
 * Authentication Service.
 *
 * Handles authentication operations: sign-in, sign-out, token refresh and
 * session validation. This service communicates with the backend but remains
 * independent of any specific authentication provider.
 */
import { apiClient } from '@api';
import type {
  SignInCredentials,
  AuthenticationResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
} from '@types';

export class AuthenticationService {
  /**
   * Authenticates a user with email and password.
   *
   * @param credentials Sign-in credentials.
   * @returns Authentication response with tokens and user.
   */
  public async signIn(
    credentials: SignInCredentials
  ): Promise<AuthenticationResponse> {
    return apiClient.post<AuthenticationResponse, SignInCredentials>(
      '/auth/sign-in',
      credentials
    );
  }

  /**
   * Refreshes an expired access token.
   *
   * @param request Token refresh request.
   * @returns New tokens.
   */
  public async refreshToken(
    request: TokenRefreshRequest
  ): Promise<TokenRefreshResponse> {
    return apiClient.post<TokenRefreshResponse, TokenRefreshRequest>(
      '/auth/refresh',
      request
    );
  }

  /**
   * Terminates the current session.
   *
   * Invalidates tokens on the backend. Local cleanup is handled by SessionService.
   */
  public async signOut(): Promise<void> {
    try {
      await apiClient.post<void>('/auth/sign-out');
    } catch {
      // Sign-out failure should not prevent local cleanup.
      // SessionService will clear local state regardless.
    }
  }

  /**
   * Validates the current session with the backend.
   *
   * Used during silent restoration to verify that stored tokens are still valid.
   */
  public async validateSession(): Promise<boolean> {
    try {
      await apiClient.get<void>('/auth/validate');
      return true;
    } catch {
      return false;
    }
  }
}

export const authenticationService = new AuthenticationService();