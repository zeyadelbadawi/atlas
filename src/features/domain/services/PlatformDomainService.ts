/**
 * Platform Domain Service (Prompt 11).
 *
 * The Atlas Platform Owner's base-domain configuration — a flat,
 * cross-tenant singleton, the same reasoning `PlanService` already
 * applies to Trial Policy: one settings resource doesn't justify its own
 * service file. `updatePlatformBaseDomain` IS a write for the same
 * reason `updateTrialPolicy` is one — this configures Atlas-wide
 * platform policy, not a tenant purchase.
 *
 * There is no real Atlas production domain configured today, and this
 * service does not pretend otherwise — `getPlatformDomainConfiguration`
 * returns whatever the backend reports (`configured: false` until a
 * Platform Owner genuinely sets one).
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  PlatformDomainConfiguration,
  UpdatePlatformDomainConfigurationPayload,
} from '@types';

export class PlatformDomainService extends BaseService {
  protected readonly resource = 'platform-domain';

  /** Retrieves Atlas's current platform base-domain configuration. */
  async getPlatformDomainConfiguration(
    options?: ReadOptions
  ): Promise<PlatformDomainConfiguration> {
    return this.client.get<PlatformDomainConfiguration>(this.path(), options);
  }

  /** Sets Atlas's platform base domain. Platform Owner only — enforced by `RouteGuard`/navigation on the consuming page, and ultimately by the backend, never by this method itself. */
  async updatePlatformDomainConfiguration(
    payload: UpdatePlatformDomainConfigurationPayload,
    options?: WriteOptions
  ): Promise<PlatformDomainConfiguration> {
    return this.client.patch<PlatformDomainConfiguration, UpdatePlatformDomainConfigurationPayload>(
      this.path(),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformDomainService = new PlatformDomainService();
