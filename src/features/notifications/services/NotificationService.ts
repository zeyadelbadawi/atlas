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
  Notification,
  NotificationPreferences,
  NotificationSummary,
  PaginatedResult,
} from '@types';

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

  async markAsRead(notificationId: string, options?: WriteOptions): Promise<Notification> {
    return this.client.patch<Notification, Record<string, never>>(
      this.path(notificationId, 'read'),
      {},
      options
    );
  }

  async markAllAsRead(options?: WriteOptions): Promise<void> {
    await this.client.post<void, Record<string, never>>(this.path('read-all'), {}, options);
  }

  async getPreferences(options?: ReadOptions): Promise<NotificationPreferences> {
    return this.client.get<NotificationPreferences>(this.path('preferences'), options);
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
}

export const notificationService = new NotificationService();
