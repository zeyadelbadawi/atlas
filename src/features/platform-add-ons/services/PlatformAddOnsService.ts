/**
 * Add-ons Catalog Management API client — Platform Owner only.
 *
 * SEARCH, FILTER AND PAGE ARE SENT TO THE SERVER. The catalog is small but
 * the pattern matches every other Platform surface, and the server is the
 * authority for what the status filter means.
 *
 * `platform-add-ons` is a deliberately distinct resource from the
 * tenant-scoped `academies/:id/add-ons/*` lifecycle routes: this controls
 * the CATALOG publication state, the tenant routes install/enable per
 * academy.
 */
import { BaseService, toQueryParams } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { PaginatedResult } from '@types';
import type {
  PlatformAddOnRow,
  PlatformAddOnQuery,
  UpdateAddOnCatalogStatusInput,
} from '../types';

export class PlatformAddOnsService extends BaseService {
  protected readonly resource = 'platform-add-ons';

  async list(
    query: PlatformAddOnQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformAddOnRow>> {
    return this.client.get<PaginatedResult<PlatformAddOnRow>>(this.path(), {
      ...options,
      params: { ...(options?.params ?? {}), ...toQueryParams(query) },
    });
  }

  async updateCatalogStatus(
    key: string,
    input: UpdateAddOnCatalogStatusInput,
    options?: WriteOptions
  ): Promise<PlatformAddOnRow> {
    return this.client.patch<PlatformAddOnRow, UpdateAddOnCatalogStatusInput>(
      this.path(key, 'status'),
      input,
      options
    );
  }
}

export const platformAddOnsService = new PlatformAddOnsService();
