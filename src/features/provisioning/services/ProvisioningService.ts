/**
 * Provisioning Service.
 *
 * Tenant-scoped, nested under the organization's resource path — the same
 * pattern `CheckoutService`/`PaymentService` (Prompt 7) already use.
 * `checkSubdomainAvailability` is deliberately NOT organization-scoped: a
 * subdomain must be unique across all of Atlas, not per Tenant, so it is
 * exposed via a manually-built path (the same pattern `PlanService` uses
 * for its Add-on catalog).
 *
 * `retryProvisioning` covers BOTH "retry a failed step" and "resume an
 * interrupted request" — from the frontend's perspective these are the
 * same instruction ("please continue this request from where it stands"),
 * and the backend is what actually decides whether that means re-running
 * a failed step or picking a stalled one back up. Exposing two near-
 * identical methods for the same customer action would be the
 * unnecessary-abstraction the spec explicitly warns against.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath, toCollectionParams } from '@api';
import type {
  CollectionQuery,
  CreateProvisioningRequestPayload,
  PaginatedResult,
  ProvisioningRequest,
  SubdomainAllocation,
} from '@types';

export class ProvisioningService extends BaseService {
  protected readonly resource = 'organizations';

  private requestsPath(organizationId: string, ...segments: readonly string[]): string {
    return this.path(organizationId, 'provisioning-requests', ...segments);
  }

  /** Creates a provisioning request. `payload.idempotencyKey` is generated once per attempt and replayed on retry — see `generateProvisioningIdempotencyKey`. */
  async createProvisioningRequest(
    organizationId: string,
    payload: CreateProvisioningRequestPayload,
    options?: WriteOptions
  ): Promise<ProvisioningRequest> {
    return this.client.post<ProvisioningRequest, CreateProvisioningRequestPayload>(
      this.requestsPath(organizationId),
      payload,
      options
    );
  }

  /** Retrieves one provisioning request's current, backend-authoritative state. */
  async getProvisioningRequest(
    organizationId: string,
    requestId: string,
    options?: ReadOptions
  ): Promise<ProvisioningRequest> {
    return this.client.get<ProvisioningRequest>(
      this.requestsPath(organizationId, requestId),
      options
    );
  }

  /**
   * Retrieves the organization's provisioning history (paginated).
   *
   * The raw `CollectionQuery` (`{ pagination: { page, pageSize }, ... }`)
   * must never be handed to Axios as `params` directly — Axios serializes
   * a nested object into bracket notation (`pagination[page]=1`), which
   * the backend's flat `CollectionQueryDto` (`page`/`pageSize`/...) does
   * not declare, and its `ValidationPipe` runs with
   * `forbidNonWhitelisted: true`, rejecting the request with a 400. Every
   * other paginated read on this service (and `BaseService.fetchCollection`)
   * goes through `toCollectionParams` for exactly this reason.
   */
  async getProvisioningRequests(
    organizationId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ProvisioningRequest>> {
    return this.client.get<PaginatedResult<ProvisioningRequest>>(
      this.requestsPath(organizationId),
      { ...options, params: { ...toCollectionParams(query), ...options?.params } }
    );
  }

  /** Continues a provisioning request — retries its failed step, or resumes an interrupted one. See the class doc comment. */
  async retryProvisioning(
    organizationId: string,
    requestId: string,
    options?: WriteOptions
  ): Promise<ProvisioningRequest> {
    return this.client.post<ProvisioningRequest, undefined>(
      this.requestsPath(organizationId, requestId, 'retry'),
      undefined,
      options
    );
  }

  /** Cancels a provisioning request, where it is still in a cancellable state. */
  async cancelProvisioning(
    organizationId: string,
    requestId: string,
    options?: WriteOptions
  ): Promise<ProvisioningRequest> {
    return this.client.post<ProvisioningRequest, undefined>(
      this.requestsPath(organizationId, requestId, 'cancel'),
      undefined,
      options
    );
  }

  /** Checks whether a subdomain is available. Global, not organization-scoped. */
  async checkSubdomainAvailability(
    subdomain: string,
    options?: ReadOptions
  ): Promise<SubdomainAllocation> {
    return this.client.get<SubdomainAllocation>(
      resourcePath('subdomains', 'availability'),
      { ...options, params: { subdomain } }
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const provisioningService = new ProvisioningService();
