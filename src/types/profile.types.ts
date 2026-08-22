/**
 * Profile types.
 *
 * Types for user profile information, preferences, and profile management.
 */

/** User profile update request. */
export interface ProfileUpdateRequest {
  readonly name?: string;
  readonly avatar?: string;
  readonly preferences?: ProfilePreferencesUpdate;
}

/** Profile preferences update. */
export interface ProfilePreferencesUpdate {
  readonly theme?: string;
  readonly language?: string;
  readonly compactMode?: boolean;
  readonly notifications?: NotificationPreferencesUpdate;
}

/** Notification preferences update. */
export interface NotificationPreferencesUpdate {
  readonly email?: boolean;
  readonly push?: boolean;
  readonly sms?: boolean;
}

/** Profile section identifier. */
export type ProfileSection = 'personal' | 'account' | 'preferences' | 'security';

/** Profile edit state. */
export interface ProfileEditState {
  readonly isEditing: boolean;
  readonly hasChanges: boolean;
  readonly isSaving: boolean;
}