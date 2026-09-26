/**
 * Onboarding Service.
 *
 * New Customer Onboarding — the owner's setup status for one organization
 * and the one write that closes it. Nested under the existing
 * `organizations` resource, the same way `TenantService` nests
 * subscription and usage: the organization IS the tenant boundary.
 *
 * Owner-only on the server (`tenant.billing.view`, which only owners
 * hold); anyone else, or another organization's id, gets 403 — which the
 * shell treats as "not yours to set up" and leaves.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CompleteOnboardingRequest,
  OnboardingStatusResponse,
} from '@types';

export class OnboardingService extends BaseService {
  protected readonly resource = 'organizations';

  /** `GET /organizations/:id/onboarding` — every step's status, derived server-side. */
  async getStatus(
    organizationId: string,
    options?: ReadOptions
  ): Promise<OnboardingStatusResponse> {
    return this.client.get<OnboardingStatusResponse>(
      this.path(organizationId, 'onboarding'),
      options
    );
  }

  /**
   * `POST /organizations/:id/onboarding/complete`.
   *
   * `finish` is refused (409 `errors.onboarding.requiredIncomplete`)
   * until the required steps are complete; `defer` ("Finish for now") is
   * always accepted. Both are idempotent and return the fresh status.
   */
  async complete(
    organizationId: string,
    request: CompleteOnboardingRequest,
    options?: WriteOptions
  ): Promise<OnboardingStatusResponse> {
    return this.client.post<OnboardingStatusResponse, CompleteOnboardingRequest>(
      this.path(organizationId, 'onboarding', 'complete'),
      request,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const onboardingService = new OnboardingService();
