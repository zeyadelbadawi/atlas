/**
 * Platform-Owner plan administration (P57).
 *
 * A SEPARATE service from `PlanService` (`features/tenant`), which stays
 * exactly as it is: read-only, customer-facing, mounted on the public
 * `plans` resource. These are Platform-Owner-only writes on
 * `platform-plans`, guarded server-side by `PlatformOwnerGuard`. Keeping
 * them apart mirrors how `PlatformAddOnsService` sits beside the customer
 * add-on catalog rather than widening it.
 *
 * ONE HYPHENATED RESOURCE SEGMENT — `resourcePath()` encodes each segment,
 * so a slashed resource would 404. See `AdminSubscriptionsService`.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type {
  CollectionQuery,
  CreatePlanPayload,
  PaginatedResult,
  Plan,
  PlanHistoryEntry,
  PlanLimitImpact,
  PlanLimits,
  UpdatePlanPayload,
} from '@types';

export class PlatformPlansService extends BaseService {
  protected readonly resource = 'platform-plans';

  async createPlan(payload: CreatePlanPayload, options?: WriteOptions): Promise<Plan> {
    return this.client.post<Plan, CreatePlanPayload>(this.path(), payload, options);
  }

  /**
   * Partial edit. `expectedVersion` is REQUIRED by the backend DTO — a
   * mismatch returns 409 `errors.concurrency.staleVersion` rather than
   * silently overwriting a colleague's change.
   */
  async updatePlan(
    key: string,
    payload: UpdatePlanPayload,
    options?: WriteOptions
  ): Promise<Plan> {
    return this.client.patch<Plan, UpdatePlanPayload>(
      this.path(key),
      payload,
      options
    );
  }

  /** Deactivation, never deletion — see `PlatformPlansService` on the backend for why no delete exists. */
  async archivePlan(
    key: string,
    expectedVersion: number,
    options?: WriteOptions
  ): Promise<Plan> {
    return this.client.post<Plan, { expectedVersion: number }>(
      this.path(key, 'archive'),
      { expectedVersion },
      options
    );
  }

  /** Dry run: who would already be over these limits. Writes nothing. */
  async previewLimitImpact(
    key: string,
    limits: PlanLimits,
    options?: WriteOptions
  ): Promise<PlanLimitImpact> {
    return this.client.post<PlanLimitImpact, { limits: PlanLimits }>(
      this.path(key, 'limits', 'preview'),
      { limits },
      options
    );
  }

  /** Administrative change history, read from the audit log. Paginated. */
  async getHistory(
    key: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlanHistoryEntry>> {
    return this.client.get<PaginatedResult<PlanHistoryEntry>>(
      this.path(key, 'history'),
      { ...options, params: { ...options?.params, ...toCollectionParams(query) } }
    );
  }
}

export const platformPlansService = new PlatformPlansService();
