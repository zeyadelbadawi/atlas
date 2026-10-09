/**
 * Current User Service.
 *
 * Retrieves and manages the authenticated user's profile. This service owns
 * user-related queries and mutations, keeping user data separate from the
 * authentication mechanics.
 */
import { apiClient } from '@api';
import type { ReadOptions } from '@api';
import type {
  CurrentUser,
  UpdatePhoneRequest,
  UserPhone,
  UserPreferences,
} from '@types';

export class CurrentUserService {
  /**
   * Fetches the authenticated user's profile.
   *
   * @returns The current user.
   */
  public async getCurrent(options?: ReadOptions): Promise<CurrentUser> {
    return apiClient.get<CurrentUser>('/users/me', options);
  }

  /**
   * Updates the authenticated user's profile.
   *
   * @param updates Partial profile updates.
   * @returns The updated user.
   */
  public async updateProfile(
    updates: Partial<Pick<CurrentUser, 'name' | 'avatar'>>
  ): Promise<CurrentUser> {
    return apiClient.patch<CurrentUser, typeof updates>('/users/me', updates);
  }

  /**
   * Updates the authenticated user's preferences.
   *
   * @param preferences Updated preferences.
   * @returns The updated user.
   */
  public async updatePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<CurrentUser> {
    return apiClient.patch<CurrentUser, { preferences: typeof preferences }>(
      '/users/me/preferences',
      { preferences }
    );
  }

  /**
   * The account's own phone number (docs/USER_PHONE.md). Not part of
   * `CurrentUser`: it is fetched only where it is shown, and its query key
   * (`userKeys.phone()`) is outside the offline persistence allowlist.
   */
  public async getPhone(options?: ReadOptions): Promise<UserPhone> {
    return apiClient.get<UserPhone>('/users/me/phone', options);
  }

  /** Sets or replaces the number. The server validates and normalises it. */
  public async updatePhone(input: UpdatePhoneRequest): Promise<UserPhone> {
    return apiClient.put<UserPhone, UpdatePhoneRequest>(
      '/users/me/phone',
      input
    );
  }

  public async removePhone(): Promise<UserPhone> {
    return apiClient.delete<UserPhone>('/users/me/phone');
  }

  /**
   * Changes the authenticated user's password.
   *
   * @param currentPassword Current password for verification.
   * @param newPassword New password.
   */
  public async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await apiClient.post<
      void,
      { currentPassword: string; newPassword: string }
    >('/users/me/password', { currentPassword, newPassword });
  }

  /**
   * Deletes the authenticated user's own account, irreversibly.
   *
   * WHY `POST` AND NOT `DELETE`. The request carries a body — the
   * confirmation flag and the optional reason — and Atlas's `apiClient`
   * types `delete` with `ReadOptions`, which has no body. Rather than
   * widen the HTTP client for one call site, the backend exposes this as
   * `POST /users/me/delete`.
   *
   * WHY THERE IS NO USER ID. The endpoint acts only on the account proved
   * by the access token. There is no parameter an attacker could swap to
   * delete somebody else, so that class of bug is absent by construction
   * rather than prevented by a check.
   *
   * Every session — not just this browser's — is dead once this returns,
   * so the caller must tear down local auth state immediately.
   */
  /**
   * Step one of deleting the account: the server emails a code to the
   * account's verified address. Nothing is deleted.
   */
  public async requestAccountDeletion(): Promise<AccountDeletionChallenge> {
    return apiClient.post<AccountDeletionChallenge, Record<string, never>>(
      '/users/me/delete/request',
      {}
    );
  }

  public async deleteAccount(input: {
    readonly challengeId: string;
    readonly code: string;
    readonly reason?: string;
    readonly feedback?: string;
  }): Promise<{ deleted: boolean; academiesArchived: number }> {
    return apiClient.post<
      { deleted: boolean; academiesArchived: number },
      {
        confirm: true;
        challengeId: string;
        code: string;
        reason?: string;
        feedback?: string;
      }
    >('/users/me/delete', { confirm: true, ...input });
  }
}

export const currentUserService = new CurrentUserService();

/** `POST /users/me/delete/request` — the emailed deletion code's handle. */
export interface AccountDeletionChallenge {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly resendAvailableAt: string;
  readonly maskedEmail: string;
}
