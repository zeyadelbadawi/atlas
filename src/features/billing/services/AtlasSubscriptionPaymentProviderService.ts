/**
 * Atlas Subscription Payment Provider Service — Generic Payment Gateway
 * Integration Readiness (2026-08-26).
 *
 * Platform Owner only. Talks to `/platform-atlas-payment-provider`, a flat,
 * cross-tenant resource — same shape as `PlatformPaymentService`/
 * `PlatformDomainService`, never nested under `organizations/:id`. This is
 * Atlas's OWN subscription-payment provider configuration, structurally
 * separate from the Organization-facing course-payment provider config
 * (§5.8) — never the same resource path, never the same secrets.
 *
 * `saveConfig` sends raw credential values ONLY in the request body — the
 * response type (`AtlasSubscriptionPaymentProviderConfig`) has no field
 * capable of echoing them back; the backend never does either.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AtlasSubscriptionPaymentProviderConfig,
  AvailableAtlasSubscriptionPaymentProvider,
  SaveAtlasSubscriptionPaymentProviderConfigPayload,
} from '@types';

export class AtlasSubscriptionPaymentProviderService extends BaseService {
  protected readonly resource = 'platform-atlas-payment-provider';

  async getAvailableProviders(
    options?: ReadOptions
  ): Promise<readonly AvailableAtlasSubscriptionPaymentProvider[]> {
    return this.client.get<readonly AvailableAtlasSubscriptionPaymentProvider[]>(
      this.path('available-providers'),
      options
    );
  }

  async getConfig(
    options?: ReadOptions
  ): Promise<AtlasSubscriptionPaymentProviderConfig> {
    return this.client.get<AtlasSubscriptionPaymentProviderConfig>(this.path(), options);
  }

  async saveConfig(
    payload: SaveAtlasSubscriptionPaymentProviderConfigPayload,
    options?: WriteOptions
  ): Promise<AtlasSubscriptionPaymentProviderConfig> {
    return this.client.patch<
      AtlasSubscriptionPaymentProviderConfig,
      SaveAtlasSubscriptionPaymentProviderConfigPayload
    >(this.path(), payload, options);
  }

  async testConnection(
    options?: WriteOptions
  ): Promise<AtlasSubscriptionPaymentProviderConfig> {
    return this.client.post<AtlasSubscriptionPaymentProviderConfig, undefined>(
      this.path('test-connection'),
      undefined,
      options
    );
  }

  async setEnabled(
    enabled: boolean,
    options?: WriteOptions
  ): Promise<AtlasSubscriptionPaymentProviderConfig> {
    return this.client.post<AtlasSubscriptionPaymentProviderConfig, undefined>(
      this.path(enabled ? 'enable' : 'disable'),
      undefined,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const atlasSubscriptionPaymentProviderService = new AtlasSubscriptionPaymentProviderService();
