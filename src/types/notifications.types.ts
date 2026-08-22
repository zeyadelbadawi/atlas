/**
 * Notification types.
 *
 * Types for in-app notifications, notification center, and notification management.
 */
import type { BaseEntity } from './common.types';

/** Notification priority levels. */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Notification type categories. */
export type NotificationType =
  | 'system'
  | 'account'
  | 'billing'
  | 'security'
  | 'activity'
  | 'announcement';

/** A single notification. */
export interface Notification extends BaseEntity {
  readonly userId: string;
  readonly type: NotificationType;
  readonly priority: NotificationPriority;
  /** Translation key for the notification title. */
  readonly titleKey: string;
  /** Translation key for the notification message. */
  readonly messageKey: string;
  /** Interpolation values for title and message. */
  readonly values?: Record<string, string | number>;
  readonly isRead: boolean;
  readonly actionUrl?: string;
  /** Translation key for the action button label. */
  readonly actionLabelKey?: string;
  readonly metadata?: Record<string, unknown>;
}

/** Notification list filters. */
export interface NotificationFilters {
  readonly type?: NotificationType;
  readonly priority?: NotificationPriority;
  readonly isRead?: boolean;
}

/** Notification summary statistics. */
export interface NotificationSummary {
  readonly total: number;
  readonly unread: number;
  readonly byType: Record<NotificationType, number>;
  readonly byPriority: Record<NotificationPriority, number>;
}

/** Notification preferences for a specific channel. */
export interface NotificationChannelPreferences {
  readonly email: boolean;
  readonly push: boolean;
  readonly sms: boolean;
  readonly inApp: boolean;
}

/** Notification preferences by type. */
export interface NotificationTypePreferences {
  readonly system: NotificationChannelPreferences;
  readonly account: NotificationChannelPreferences;
  readonly billing: NotificationChannelPreferences;
  readonly security: NotificationChannelPreferences;
  readonly activity: NotificationChannelPreferences;
  readonly announcement: NotificationChannelPreferences;
}