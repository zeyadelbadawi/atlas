/**
 * AdminSubscriptionsService — the platform-wide subscription/trial
 * operations view.
 *
 * Platform-Owner-only on the server (`PlatformOwnerGuard`). Nothing here
 * takes an organization id: the whole point is the cross-tenant view, and
 * the backend decides who may have it.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { AdminSubscriptionOverview } from '@types';

export class AdminSubscriptionsService extends BaseService {
  /*
    ONE HYPHENATED SEGMENT. `resourcePath()` runs `encodeURIComponent` over
    every segment, so a resource containing `/` becomes `platform%2F...` and
    404s — which is exactly why this page showed "Unexpected error" from the
    day it shipped. Matches every sibling (`platform-add-ons`,
    `platform-zoom`, `platform-academies`, `platform-users`).
  */
  protected readonly resource = 'platform-subscriptions';

  async getOverview(options?: ReadOptions): Promise<AdminSubscriptionOverview> {
    return this.client.get<AdminSubscriptionOverview>(
      this.path('overview'),
      options
    );
  }
}

export const adminSubscriptionsService = new AdminSubscriptionsService();
