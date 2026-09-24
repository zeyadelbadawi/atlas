/**
 * Platform Settings Service.
 *
 * A singleton configuration resource (like `PlatformMetricsService`) —
 * exactly one current configuration, never a collection.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  PlatformCommunicationSettings,
  PlatformConfiguration,
  UpdatePlatformCommunicationSettingsPayload,
} from '@types';

export class PlatformSettingsService extends BaseService {
  protected readonly resource = 'platform-settings';

  async getConfiguration(
    options?: ReadOptions
  ): Promise<PlatformConfiguration> {
    return this.client.get<PlatformConfiguration>(this.path(), options);
  }

  async updateConfiguration(
    payload: Partial<PlatformConfiguration>,
    options?: WriteOptions
  ): Promise<PlatformConfiguration> {
    return this.client.patch<
      PlatformConfiguration,
      Partial<PlatformConfiguration>
    >(this.path(), payload, options);
  }

  /** P66 — `GET platform-settings/communications`. */
  async getCommunications(
    options?: ReadOptions
  ): Promise<PlatformCommunicationSettings> {
    return this.client.get<PlatformCommunicationSettings>(
      this.path('communications'),
      options
    );
  }

  /** P66 — `PATCH platform-settings/communications`; `providerStatus` is never sent. */
  async updateCommunications(
    payload: UpdatePlatformCommunicationSettingsPayload,
    options?: WriteOptions
  ): Promise<PlatformCommunicationSettings> {
    return this.client.patch<
      PlatformCommunicationSettings,
      UpdatePlatformCommunicationSettingsPayload
    >(this.path('communications'), payload, options);
  }
}

export const platformSettingsService = new PlatformSettingsService();
