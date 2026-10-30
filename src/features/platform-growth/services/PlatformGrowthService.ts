/**
 * G1 — Growth & capacity (`platform-growth/*`). Platform Owner only on the
 * server (PlatformOwnerGuard + platform-only RLS); every response is
 * `private, no-store`. Versioned writes answer 409 when someone saved first.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CacReport,
  CapacityReport,
  GrowthSettings,
  MonthRange,
  OrganizationAcquisition,
  SetOrganizationChannelPayload,
  SpendEntry,
  SpendList,
  SpendWritePayload,
  UpdateGrowthSettingsPayload,
} from '../types';

export class PlatformGrowthService extends BaseService {
  protected readonly resource = 'platform-growth';

  async getSettings(options?: ReadOptions): Promise<GrowthSettings> {
    return this.client.get<GrowthSettings>(this.path('settings'), options);
  }

  async updateSettings(
    payload: UpdateGrowthSettingsPayload,
    options?: WriteOptions
  ): Promise<GrowthSettings> {
    return this.client.patch<GrowthSettings, UpdateGrowthSettingsPayload>(
      this.path('settings'),
      payload,
      options
    );
  }

  async listSpend(
    range?: Partial<MonthRange>,
    options?: ReadOptions
  ): Promise<SpendList> {
    return this.client.get<SpendList>(this.path('spend'), {
      ...options,
      params: { ...rangeParams(range), ...options?.params },
    });
  }

  async createSpend(
    payload: SpendWritePayload,
    options?: WriteOptions
  ): Promise<SpendEntry> {
    return this.client.post<SpendEntry, SpendWritePayload>(
      this.path('spend'),
      payload,
      options
    );
  }

  async updateSpend(
    id: string,
    payload: Partial<SpendWritePayload> & { readonly version: number },
    options?: WriteOptions
  ): Promise<SpendEntry> {
    return this.client.patch<
      SpendEntry,
      Partial<SpendWritePayload> & { readonly version: number }
    >(this.path('spend', id), payload, options);
  }

  async deleteSpend(id: string, options?: WriteOptions): Promise<void> {
    await this.client.delete<void>(this.path('spend', id), options);
  }

  async getCac(
    range?: Partial<MonthRange>,
    options?: ReadOptions
  ): Promise<CacReport> {
    return this.client.get<CacReport>(this.path('cac'), {
      ...options,
      params: { ...rangeParams(range), ...options?.params },
    });
  }

  async getCapacity(options?: ReadOptions): Promise<CapacityReport> {
    return this.client.get<CapacityReport>(this.path('capacity'), options);
  }

  async setOrganizationChannel(
    organizationId: string,
    payload: SetOrganizationChannelPayload,
    options?: WriteOptions
  ): Promise<OrganizationAcquisition> {
    return this.client.patch<
      OrganizationAcquisition,
      SetOrganizationChannelPayload
    >(this.path('organizations', organizationId, 'channel'), payload, options);
  }
}

function rangeParams(range?: Partial<MonthRange>): Record<string, string> {
  const params: Record<string, string> = {};
  if (range?.from) params.from = range.from;
  if (range?.to) params.to = range.to;
  return params;
}

export const platformGrowthService = new PlatformGrowthService();
