/**
 * Current User Service.
 *
 * Retrieves and manages the authenticated user's profile. This service owns
 * user-related queries and mutations, keeping user data separate from the
 * authentication mechanics.
 */
import { apiClient } from '@api';
import type { CurrentUser, UserPreferences } from '@types';

export class CurrentUserService {
  /**
   * Fetches the authenticated user's profile.
   *
   * @returns The current user.
   */
  public async getCurrent(): Promise<CurrentUser> {
    return apiClient.get<CurrentUser>('/users/me');
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
   * Changes the authenticated user's password.
   *
   * @param currentPassword Current password for verification.
   * @param newPassword New password.
   */
  public async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await apiClient.post<void, { currentPassword: string; newPassword: string }>(
      '/users/me/password',
      { currentPassword, newPassword }
    );
  }
}

export const currentUserService = new CurrentUserService();