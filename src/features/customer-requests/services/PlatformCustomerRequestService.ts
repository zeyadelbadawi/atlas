/**
 * Platform Customer Request Service — the Platform Owner console for
 * custom-service requests, and the per-type routing of their emails.
 *
 * Every route sits behind `JwtAuthGuard` + `ManagementSurfaceGuard` +
 * `PlatformOwnerGuard` and RLS; the route guard in this app only decides
 * what is shown.
 *
 * `path()` encodes each segment on its own, so the two-segment resources
 * are passed as `'platform'` + `'customer-requests'`, never one string
 * containing a slash (see `PlatformContactSubmissionService`).
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type { PaginatedResult } from '@types';
import type {
  CustomerRequestAssigneeOption,
  CustomerRequestCounts,
  CustomerRequestRoutingRule,
  PlatformCustomerRequestDetail,
  PlatformCustomerRequestFilters,
  PlatformCustomerRequestListQuery,
  PlatformCustomerRequestSummary,
  TeamCustomerRequestMessagePayload,
  UpdatePlatformCustomerRequestPayload,
  UpdateRoutingRulesPayload,
} from '../types/customer-request.types';

export class PlatformCustomerRequestService extends BaseService {
  protected readonly resource = 'platform';

  private requestsPath(...segments: readonly string[]): string {
    return this.path('customer-requests', ...segments);
  }

  private routingPath(): string {
    return this.path('customer-request-routing');
  }

  /** `GET platform/customer-requests` — one page across every academy. */
  async list(
    query?: PlatformCustomerRequestListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformCustomerRequestSummary>> {
    return this.client.get<PaginatedResult<PlatformCustomerRequestSummary>>(
      this.requestsPath(),
      {
        ...options,
        params: {
          ...toCollectionParams<PlatformCustomerRequestFilters>(query),
          ...options?.params,
        },
      }
    );
  }

  /** `GET platform/customer-requests/counts` — open + per-status counts. */
  async counts(options?: ReadOptions): Promise<CustomerRequestCounts> {
    return this.client.get<CustomerRequestCounts>(
      this.requestsPath('counts'),
      options
    );
  }

  /** `GET platform/customer-requests/assignees` — the Platform Owners a request can go to. */
  async assignees(
    options?: ReadOptions
  ): Promise<readonly CustomerRequestAssigneeOption[]> {
    return this.client.get<readonly CustomerRequestAssigneeOption[]>(
      this.requestsPath('assignees'),
      options
    );
  }

  /** `GET platform/customer-requests/:requestId` — full history incl. internal notes. */
  async get(
    requestId: string,
    options?: ReadOptions
  ): Promise<PlatformCustomerRequestDetail> {
    return this.client.get<PlatformCustomerRequestDetail>(
      this.requestsPath(requestId),
      options
    );
  }

  /** `PATCH platform/customer-requests/:requestId` — status and/or assignee. */
  async update(
    requestId: string,
    payload: UpdatePlatformCustomerRequestPayload,
    options?: WriteOptions
  ): Promise<PlatformCustomerRequestDetail> {
    return this.client.patch<
      PlatformCustomerRequestDetail,
      UpdatePlatformCustomerRequestPayload
    >(this.requestsPath(requestId), payload, options);
  }

  /** `POST platform/customer-requests/:requestId/messages` — a reply or an internal note. */
  async message(
    requestId: string,
    payload: TeamCustomerRequestMessagePayload,
    options?: WriteOptions
  ): Promise<PlatformCustomerRequestDetail> {
    return this.client.post<
      PlatformCustomerRequestDetail,
      TeamCustomerRequestMessagePayload
    >(this.requestsPath(requestId, 'messages'), payload, options);
  }

  /** `GET platform/customer-request-routing` — one rule per request type. */
  async routing(
    options?: ReadOptions
  ): Promise<readonly CustomerRequestRoutingRule[]> {
    return this.client.get<readonly CustomerRequestRoutingRule[]>(
      this.routingPath(),
      options
    );
  }

  /** `PUT platform/customer-request-routing` — the whole table at once. */
  async updateRouting(
    payload: UpdateRoutingRulesPayload,
    options?: WriteOptions
  ): Promise<readonly CustomerRequestRoutingRule[]> {
    return this.client.put<
      readonly CustomerRequestRoutingRule[],
      UpdateRoutingRulesPayload
    >(this.routingPath(), payload, options);
  }
}

export const platformCustomerRequestService =
  new PlatformCustomerRequestService();
