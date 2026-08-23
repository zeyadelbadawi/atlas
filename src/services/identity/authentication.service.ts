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
  RegistrationRequest,
  PasswordResetRequest,
  PasswordResetConfirmation,
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

  /**
   * Registers a new account. Does not sign the caller in — matches
   * `RegistrationForm`'s existing "navigate to sign-in after success"
   * behavior, never an auto-login the form doesn't ask for.
   */
  public async register(request: RegistrationRequest): Promise<void> {
    await apiClient.post<void, RegistrationRequest>('/auth/register', request);
  }

  /** Requests a password-reset email be sent to the given address. */
  public async requestPasswordReset(
    request: PasswordResetRequest
  ): Promise<void> {
    await apiClient.post<void, PasswordResetRequest>(
      '/auth/password-reset/request',
      request
    );
  }

  /** Completes a password reset using the token from the reset email. */
  public async confirmPasswordReset(
    request: PasswordResetConfirmation
  ): Promise<void> {
    await apiClient.post<void, PasswordResetConfirmation>(
      '/auth/password-reset/confirm',
      request
    );
  }
}

export const authenticationService = new AuthenticationService();