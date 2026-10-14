/**
 * B0-ANL-04 — the Platform Owner's operator-only flags on one organization.
 *
 * `isInternal` marks a test, demo or staff organization so platform
 * metrics (MRR) leave it out. Platform-Owner-only on the server
 * (`PlatformOwnerGuard` + platform-only RLS); tenants never see it.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';

export interface OrganizationPlatformFlags {
  readonly organizationId: string;
  readonly isInternal: boolean;
  readonly updatedAt?: string;
}

export class PlatformOrganizationFlagsService extends BaseService {
  protected readonly resource = 'platform-organizations';

  async get(
    organizationId: string,
    options?: ReadOptions
  ): Promise<OrganizationPlatformFlags> {
    return this.client.get<OrganizationPlatformFlags>(
      this.path(organizationId, 'flags'),
      options
    );
  }

  async setInternal(
    organizationId: string,
    isInternal: boolean,
    options?: WriteOptions
  ): Promise<OrganizationPlatformFlags> {
    return this.client.patch<
      OrganizationPlatformFlags,
      { readonly isInternal: boolean }
    >(this.path(organizationId, 'flags'), { isInternal }, options);
  }
}

export const platformOrganizationFlagsService =
  new PlatformOrganizationFlagsService();
