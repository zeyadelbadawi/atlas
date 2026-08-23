/**
 * Platform Settings Service.
 *
 * A singleton configuration resource (like `PlatformMetricsService`) —
 * exactly one current configuration, never a collection.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { PlatformConfiguration } from '@types';

export class PlatformSettingsService extends BaseService {
  protected readonly resource = 'platform-settings';

  async getConfiguration(options?: ReadOptions): Promise<PlatformConfiguration> {
    return this.client.get<PlatformConfiguration>(this.path(), options);
  }

  async updateConfiguration(
    payload: Partial<PlatformConfiguration>,
    options?: WriteOptions
  ): Promise<PlatformConfiguration> {
    return this.client.patch<PlatformConfiguration, Partial<PlatformConfiguration>>(
      this.path(),
      payload,
      options
    );
  }
}

export const platformSettingsService = new PlatformSettingsService();
