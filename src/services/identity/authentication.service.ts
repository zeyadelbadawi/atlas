/**
 * Authentication Service.
 *
 * Handles authentication operations: sign-in, sign-out, token refresh and
 * session validation. This service communicates with the backend but remains
 * independent of any specific authentication provider.
 */
import { apiClient } from '@api';
import { resourcePath } from '@services/api/request.utils';
import type {
  SignInCredentials,
  AuthenticationResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  RegistrationRequest,
  RegistrationResult,
  PasswordResetRequest,
  PasswordResetConfirmation,
  PasswordResetTokenValidation,
  EmailVerificationRequest,
  UserSession,
  AuthenticationResponse as OtpAuthenticationResponse,
  EmailOtpVerifyInput,
  EmailOtpResendResult,
  TrustedDevice,
  TrustedDeviceList,
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
  public async register(
    request: RegistrationRequest
  ): Promise<RegistrationResult> {
    const response = await apiClient.post<
      RegistrationResult | undefined,
      RegistrationRequest
    >('/auth/register', request);
    // An older backend answered with an empty body — that was always a new account.
    return response?.account === 'existing'
      ? { account: 'existing' }
      : { account: 'new' };
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

  /**
   * P64 Phase 1 — whether a reset token is currently usable, so the reset
   * page can show "invalid or expired" BEFORE asking for a new password
   * instead of only finding out on submit. Reveals nothing about whom the
   * token belongs to.
   */
  public async validatePasswordResetToken(token: string): Promise<boolean> {
    const result = await apiClient.post<
      PasswordResetTokenValidation,
      { token: string }
    >('/auth/password-reset/validate', { token });
    return result.valid === true;
  }

  /**
   * Phase 10.1 / P64 Phase 1 — completes email verification with the
   * emailed token. Public: the recipient is by definition not signed in.
   */
  public async verifyEmail(request: EmailVerificationRequest): Promise<void> {
    await apiClient.post<void, EmailVerificationRequest>(
      '/auth/verify-email',
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

  /**
   * Lists the caller's own active device sessions (Phase 10).
   *
   * Scoped entirely by the access token — there is no user-id parameter,
   * by design: the backend resolves the owner from the verified token, so
   * this endpoint can never be pointed at another user's sessions.
   */
  public async listSessions(): Promise<readonly UserSession[]> {
    return apiClient.get<readonly UserSession[]>('/auth/sessions');
  }

  /**
   * Revokes one device session. Takes effect against the backend's actual
   * token-validation path immediately, not just the stored row, so the
   * revoked device's next request fails rather than working until its
   * access token happens to expire.
   *
   * Revoking the CURRENT session is allowed and is the "sign out this
   * device" case — the caller is responsible for tearing down local
   * session state afterwards, since every subsequent request will 401.
   */
  public async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete<void>(resourcePath('auth', 'sessions', sessionId));
  }

  /**
   * P66 — completes a sign-in that stopped for an emailed one-time code.
   *
   * Mirrors `TwoFactorService.verifyChallenge`: the challenge id travels
   * in the BODY, never as an Authorization header, and `surface`/
   * `academyId` are the ORIGINAL sign-in's so the session minted here is
   * shaped for the same surface. `rememberDevice` asks the backend to
   * trust this browser for its configured window.
   */
  public async verifyEmailOtp(
    input: EmailOtpVerifyInput
  ): Promise<OtpAuthenticationResponse> {
    return apiClient.post<OtpAuthenticationResponse, EmailOtpVerifyInput>(
      '/auth/otp/verify',
      input
    );
  }

  /** P66 — a fresh code for the same challenge; returns the next cooldown. */
  public async resendEmailOtp(
    challengeId: string
  ): Promise<EmailOtpResendResult> {
    return apiClient.post<EmailOtpResendResult, { challengeId: string }>(
      '/auth/otp/resend',
      { challengeId }
    );
  }

  /**
   * P66 — the browsers this account chose to remember at an email-code
   * step. Owner-scoped by the access token, like `listSessions`.
   */
  public async listTrustedDevices(): Promise<readonly TrustedDevice[]> {
    const response = await apiClient.get<TrustedDeviceList>(
      '/auth/trusted-devices'
    );
    return response.items ?? [];
  }

  /** P66 — forgets one remembered browser; its next sign-in asks for a code again. */
  public async revokeTrustedDevice(deviceId: string): Promise<void> {
    await apiClient.delete<void>(
      resourcePath('auth', 'trusted-devices', deviceId)
    );
  }

  /** P66 — forgets every remembered browser except the current one. */
  public async revokeOtherTrustedDevices(): Promise<void> {
    await apiClient.delete<void>('/auth/trusted-devices');
  }
}

export const authenticationService = new AuthenticationService();
