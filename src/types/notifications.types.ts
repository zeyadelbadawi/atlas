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
  'system' | 'account' | 'billing' | 'security' | 'activity' | 'announcement';

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

/**
 * Communication preferences (`GET/PATCH users/me/communication-preferences`).
 *
 * Five categories, three of which are LOCKED: security, transactional and
 * lifecycle mail is always sent because a person cannot opt out of "your
 * password changed" or "your order was refunded" and still be safe. The
 * `locked: true` literal is part of the wire shape so the UI renders the
 * lock from the contract rather than from a hard-coded list of category
 * names. `operational` is `null` for an account with nothing to operate
 * (a learner), and the row is simply not shown.
 */
export type CommunicationDigest = 'immediate' | 'daily' | 'off';

export type CommunicationLanguage = 'en' | 'ar';

export interface LockedCommunicationCategory {
  readonly email: true;
  readonly locked: true;
}

export interface LifecycleCommunicationCategory
  extends LockedCommunicationCategory {
  /** Reminder mail (an upcoming session, an expiring trial) can be muted. */
  readonly reminders: boolean;
}

export interface EngagementCommunicationCategory {
  readonly email: boolean;
  readonly digest: CommunicationDigest;
}

export interface OperationalCommunicationCategory {
  readonly email: boolean;
  readonly digest: Exclude<CommunicationDigest, 'off'>;
}

export interface CommunicationPreferences {
  readonly language: CommunicationLanguage;
  readonly categories: {
    readonly security: LockedCommunicationCategory;
    readonly transactional: LockedCommunicationCategory;
    readonly lifecycle: LifecycleCommunicationCategory;
    readonly engagement: EngagementCommunicationCategory;
    readonly operational: OperationalCommunicationCategory | null;
  };
}

/** The `PATCH` body — only what a person may change. */
export interface CommunicationPreferencesUpdate {
  readonly language?: CommunicationLanguage;
  readonly lifecycle?: { readonly reminders: boolean };
  readonly engagement?: EngagementCommunicationCategory;
  readonly operational?: OperationalCommunicationCategory;
}

export type CommunicationCategoryId = keyof CommunicationPreferences['categories'];
