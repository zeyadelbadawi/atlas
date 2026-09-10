/**
 * Two-factor authentication service (Phase 10.3).
 *
 * NOTHING HERE CACHES SECRET MATERIAL. `startSetup` returns the TOTP
 * secret and `confirmSetup`/`regenerateRecoveryCodes` return recovery
 * codes; all three are shown to the user exactly once and are
 * unrecoverable afterwards, so they are passed straight through to the
 * caller and never written to storage, a query cache, or a log.
 */
import { apiClient } from '@api';
import type {
  AuthenticationResponse,
  TwoFactorSetupResult,
  TwoFactorStatus,
} from '@types';

export class TwoFactorService {
  async getStatus(): Promise<TwoFactorStatus> {
    return apiClient.get<TwoFactorStatus>('/auth/2fa/status');
  }

  /** Begins enrolment. The returned secret is shown once and never again. */
  async startSetup(): Promise<TwoFactorSetupResult> {
    return apiClient.post<TwoFactorSetupResult, Record<string, never>>(
      '/auth/2fa/setup',
      {}
    );
  }

  /** Completes enrolment and returns the recovery codes — also shown once. */
  async confirmSetup(token: string): Promise<{ recoveryCodes: string[] }> {
    return apiClient.post<{ recoveryCodes: string[] }, { token: string }>(
      '/auth/2fa/confirm',
      { token }
    );
  }

  /**
   * Completes a sign-in that stopped for a second factor.
   *
   * The challenge id travels in the BODY, never as an Authorization
   * header: it is not a token, and the backend does not accept it as one.
   */
  async verifyChallenge(input: {
    readonly challengeId: string;
    readonly token?: string;
    readonly recoveryCode?: string;
  }): Promise<AuthenticationResponse> {
    return apiClient.post<AuthenticationResponse, typeof input>(
      '/auth/2fa/verify',
      input
    );
  }

  /**
   * Turns 2FA off. The password is required by the backend — a valid
   * session is deliberately not sufficient.
   */
  async disable(password: string): Promise<void> {
    await apiClient.post<void, { password: string }>('/auth/2fa/disable', {
      password,
    });
  }

  /** Issues a new set of recovery codes, invalidating every previous one. */
  async regenerateRecoveryCodes(
    password: string
  ): Promise<{ recoveryCodes: string[] }> {
    return apiClient.post<{ recoveryCodes: string[] }, { password: string }>(
      '/auth/2fa/recovery-codes',
      { password }
    );
  }
}

export const twoFactorService = new TwoFactorService();
