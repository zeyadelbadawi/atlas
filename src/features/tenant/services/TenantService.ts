/**
 * Tenant Service.
 *
 * Every method here is scoped by `organizationId` — the existing
 * Organization identity IS the Tenant boundary (see
 * `Reports/ARCHITECTURE.md`, Prompt 6). Nested under the existing
 * `organizations` resource, the same way `AcademyService` nests
 * members/stats/activity/branding under one academy.
 *
 * Originally read-only: Prompt 6 executed no plan changes or add-on
 * purchases, since no payment provider existed.
 *
 * Phase 10.2 added three writes — `startTrial`, `cancelTrial` and
 * `cancelSubscription`. They are subscription LIFECYCLE operations, not
 * purchases: none of them moves money or touches a payment provider, so
 * the original "no payments here" boundary still holds. Real plan
 * purchases continue to go through the checkout/payment surfaces.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CancellationResult,
  CancelSubscriptionRequest,
  CancelSubscriptionRequestInput,
  StartTrialRequest,
  StartTrialResult,
  TenantAddOn,
  TenantSubscription,
  TenantUsage,
} from '@types';

export class TenantService extends BaseService {
  protected readonly resource = 'organizations';

  /** Retrieves the Tenant's (Organization's) current subscription. */
  async getSubscription(
    organizationId: string,
    options?: ReadOptions
  ): Promise<TenantSubscription> {
    return this.client.get<TenantSubscription>(
      this.path(organizationId, 'subscription'),
      options
    );
  }

  /** Retrieves the Tenant's current resource usage. */
  async getUsage(
    organizationId: string,
    options?: ReadOptions
  ): Promise<TenantUsage> {
    return this.client.get<TenantUsage>(
      this.path(organizationId, 'usage'),
      options
    );
  }

  /** Retrieves the Add-ons currently active on the Tenant's subscription. */
  async getActiveAddOns(
    organizationId: string,
    options?: ReadOptions
  ): Promise<readonly TenantAddOn[]> {
    return this.client.get<readonly TenantAddOn[]>(
      this.path(organizationId, 'add-ons'),
      options
    );
  }

  /**
   * Redeems the Free Trial for this Organization (Phase 10.2).
   *
   * `confirm: true` is required by the backend contract. It is not a
   * security control — a client can always send it — but it means no
   * stray retry, prefetch or mis-wired button can burn the user's one
   * trial without a deliberate, explicit action.
   *
   * A refusal is NOT an error: the backend answers 200 with
   * `started: false` and a reason, because "you have already used your
   * trial" is an ordinary business outcome. Callers must read `started`
   * rather than relying on the absence of a thrown error.
   */
  async startTrial(
    organizationId: string,
    input: { readonly planId?: string },
    options?: WriteOptions
  ): Promise<StartTrialResult> {
    return this.client.post<StartTrialResult, StartTrialRequest>(
      this.path(organizationId, 'subscription', 'trial'),
      { confirm: true, planId: input.planId },
      options
    );
  }

  /**
   * Cancels an active Free Trial. Access ends immediately.
   *
   * `feedback` is optional at every layer — never required to cancel.
   */
  async cancelTrial(
    organizationId: string,
    input: CancelSubscriptionRequestInput,
    options?: WriteOptions
  ): Promise<CancellationResult> {
    return this.client.post<CancellationResult, CancelSubscriptionRequest>(
      this.path(organizationId, 'subscription', 'trial', 'cancel'),
      { confirm: true, reason: input.reason, feedback: input.feedback },
      options
    );
  }

  /**
   * Cancels a paid subscription at the end of the period already paid
   * for — the returned `effectiveAt` is when access actually ends, not
   * "now".
   */
  async cancelSubscription(
    organizationId: string,
    input: CancelSubscriptionRequestInput,
    options?: WriteOptions
  ): Promise<CancellationResult> {
    return this.client.post<CancellationResult, CancelSubscriptionRequest>(
      this.path(organizationId, 'subscription', 'cancel'),
      { confirm: true, reason: input.reason, feedback: input.feedback },
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const tenantService = new TenantService();
