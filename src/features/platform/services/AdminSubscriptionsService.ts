/**
 * AdminSubscriptionsService — the platform-wide subscription/trial
 * operations view.
 *
 * Platform-Owner-only on the server (`PlatformOwnerGuard`). Nothing here
 * takes an organization id: the whole point is the cross-tenant view, and
 * the backend decides who may have it.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { AdminSubscriptionOverview, TenantSubscription } from '@types';

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

  /**
   * B0-BIL-06 — the Platform Owner's audited remedies on one
   * organization's subscription. Each requires a written reason; the
   * server writes the audit row and returns the updated subscription.
   */
  async adjustDays(
    organizationId: string,
    kind: 'extend' | 'grant-days',
    payload: SubscriptionDaysAdjustment,
    options?: WriteOptions
  ): Promise<TenantSubscription> {
    return this.client.post<TenantSubscription, SubscriptionDaysAdjustment>(
      this.path(organizationId, kind),
      payload,
      options
    );
  }

  async changePlan(
    organizationId: string,
    payload: SubscriptionPlanChange,
    options?: WriteOptions
  ): Promise<TenantSubscription> {
    return this.client.post<TenantSubscription, SubscriptionPlanChange>(
      this.path(organizationId, 'change-plan'),
      payload,
      options
    );
  }
}

export interface SubscriptionDaysAdjustment {
  readonly days: number;
  readonly reason: string;
}

export interface SubscriptionPlanChange {
  readonly planKey: string;
  readonly applyAt: 'now' | 'period_end';
  readonly reason: string;
}

export const adminSubscriptionsService = new AdminSubscriptionsService();
