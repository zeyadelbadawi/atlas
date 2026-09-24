/**
 * Notification Service.
 *
 * User-scoped: the backend infers "my notifications" from the session,
 * the same way `TenantService`/`CheckoutService` never pass a user id —
 * only the client-side query key (`notificationKeys`) embeds the current
 * user's id, for correct cache scoping across account switches.
 *
 * `markAllAsRead` is a standard, universally-understood notification-center
 * action — not an invented workflow. There is no archive/clear mutation
 * because no such contract is specification-supported; the inert "Clear
 * All" button this replaces (Prompt 3A) is removed, not wired to a fake
 * call.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  CommunicationPreferences,
  CommunicationPreferencesUpdate,
  Notification,
  NotificationPreferences,
  NotificationSummary,
  PaginatedResult,
} from '@types';

/**
 * Communication preferences live under the USER resource, not under
 * `notifications/` — they describe what mail the account receives, and
 * the backend mounts them at `users/me/communication-preferences`. The
 * path is therefore written out rather than built with `this.path()`.
 */
const COMMUNICATION_PREFERENCES_PATH = 'users/me/communication-preferences';

export class NotificationService extends BaseService {
  protected readonly resource = 'notifications';

  async getNotifications(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Notification>> {
    return this.fetchCollection<Notification>(query, options);
  }

  async getSummary(options?: ReadOptions): Promise<NotificationSummary> {
    return this.client.get<NotificationSummary>(this.path('summary'), options);
  }

  async markAsRead(
    notificationId: string,
    options?: WriteOptions
  ): Promise<Notification> {
    return this.client.patch<Notification, Record<string, never>>(
      this.path(notificationId, 'read'),
      {},
      options
    );
  }

  async markAllAsRead(options?: WriteOptions): Promise<void> {
    await this.client.post<void, Record<string, never>>(
      this.path('read-all'),
      {},
      options
    );
  }

  async getPreferences(
    options?: ReadOptions
  ): Promise<NotificationPreferences> {
    return this.client.get<NotificationPreferences>(
      this.path('preferences'),
      options
    );
  }

  async updatePreferences(
    payload: NotificationPreferences,
    options?: WriteOptions
  ): Promise<NotificationPreferences> {
    return this.client.patch<NotificationPreferences, NotificationPreferences>(
      this.path('preferences'),
      payload,
      options
    );
  }

  async getCommunicationPreferences(
    options?: ReadOptions
  ): Promise<CommunicationPreferences> {
    return this.client.get<CommunicationPreferences>(
      COMMUNICATION_PREFERENCES_PATH,
      options
    );
  }

  async updateCommunicationPreferences(
    payload: CommunicationPreferencesUpdate,
    options?: WriteOptions
  ): Promise<CommunicationPreferences> {
    return this.client.patch<
      CommunicationPreferences,
      CommunicationPreferencesUpdate
    >(COMMUNICATION_PREFERENCES_PATH, payload, options);
  }
}

export const notificationService = new NotificationService();
