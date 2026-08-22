/**
 * Platform Provisioning Service.
 *
 * A SEPARATE, flat `provisioning-requests` resource — deliberately not
 * nested under `organizations/:organizationId`, unlike `ProvisioningService`.
 * A Platform Owner operates the provisioning console ACROSS every Tenant,
 * the same "third service tree over one entity" reasoning
 * `PlatformPaymentService` (Prompt 7) and `InstructorService` (Prompt 5)
 * already established. Extends BaseService to keep the same architectural
 * contract.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CollectionQuery,
  PaginatedResult,
  ProvisioningRequest,
} from '@types';

export class PlatformProvisioningService extends BaseService {
  protected readonly resource = 'provisioning-requests';

  /** Retrieves provisioning requests across every organization, for the Platform Owner console. */
  async getProvisioningRequests(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ProvisioningRequest>> {
    return this.fetchCollection<ProvisioningRequest>(query, options);
  }

  /** Retrieves one provisioning request for the console. */
  async getProvisioningRequest(
    requestId: string,
    options?: ReadOptions
  ): Promise<ProvisioningRequest> {
    return this.fetchOne<ProvisioningRequest>(requestId, options);
  }

  /** Continues a provisioning request on the Tenant's behalf — same semantics as `ProvisioningService.retryProvisioning`. */
  async retryProvisioning(
    requestId: string,
    options?: WriteOptions
  ): Promise<ProvisioningRequest> {
    return this.client.post<ProvisioningRequest, undefined>(
      this.path(requestId, 'retry'),
      undefined,
      options
    );
  }

  /** Cancels a provisioning request on the Tenant's behalf. */
  async cancelProvisioning(
    requestId: string,
    options?: WriteOptions
  ): Promise<ProvisioningRequest> {
    return this.client.post<ProvisioningRequest, undefined>(
      this.path(requestId, 'cancel'),
      undefined,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformProvisioningService = new PlatformProvisioningService();
